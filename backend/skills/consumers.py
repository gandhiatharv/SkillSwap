import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import UserActivity, VideoCall
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

class ActivityConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        if self.user.is_anonymous:
            logger.warning("Anonymous user tried to connect to ActivityConsumer")
            await self.close()
            return
            
        self.group_name = "activity_updates"
        
        # Join activity group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
        logger.info(f"User {self.user.username} connected to activity updates")
        
        # Mark user as online
        await self.set_user_online(True)
        
        # Send current active users to the newly connected user
        active_users = await self.get_active_users()
        await self.send(text_data=json.dumps({
            'type': 'active_users_list',
            'active_users': active_users
        }))
        
        # Broadcast user came online to others
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'user_activity_update',
                'user_id': self.user.id,
                'username': self.user.username,
                'is_online': True
            }
        )

    async def disconnect(self, close_code):
        if not hasattr(self, 'user') or self.user.is_anonymous:
            return
            
        logger.info(f"User {self.user.username} disconnected from activity updates")
        
        # Mark user as offline
        await self.set_user_online(False)
        
        # Broadcast user went offline
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'user_activity_update',
                'user_id': self.user.id,
                'username': self.user.username,
                'is_online': False
            }
        )
        
        # Leave activity group
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def user_activity_update(self, event):
        # Don't send updates about self
        if event.get('user_id') != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'activity_update',
                'user_id': event['user_id'],
                'username': event['username'],
                'is_online': event['is_online']
            }))

    @database_sync_to_async
    def get_active_users(self):
        try:
            active_users = []
            activities = UserActivity.objects.select_related('user').filter(is_online=True)
            for activity in activities:
                if activity.user.id != self.user.id:  # Don't include self
                    active_users.append({
                        'id': activity.user.id,
                        'username': activity.user.username,
                    })
            return active_users
        except Exception as e:
            logger.error(f"Error getting active users: {e}")
            return []

    @database_sync_to_async
    def set_user_online(self, is_online):
        try:
            activity, created = UserActivity.objects.get_or_create(
                user=self.user,
                defaults={'is_online': is_online, 'socket_id': self.channel_name}
            )
            if not created:
                activity.is_online = is_online
                activity.socket_id = self.channel_name if is_online else None
                activity.last_seen = timezone.now()
                activity.save()
            logger.info(f"Set user {self.user.username} online status to {is_online}")
        except Exception as e:
            logger.error(f"Error setting user online status: {e}")


class VideoCallConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        if self.user.is_anonymous:
            logger.warning("Anonymous user tried to connect to VideoCallConsumer")
            await self.close()
            return
            
        self.user_group_name = f"video_call_user_{self.user.id}"
        
        # Join user's personal group
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )
        
        await self.accept()
        logger.info(f"User {self.user.username} connected to video call system")

    async def disconnect(self, close_code):
        if hasattr(self, 'user_group_name'):
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )
        
        if hasattr(self, 'user') and not self.user.is_anonymous:
            logger.info(f"User {self.user.username} disconnected from video call system")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            logger.info(f"Received message type: {message_type} from user {self.user.username}")
            
            if message_type == 'call_initiate':
                await self.handle_call_initiate(data)
            elif message_type == 'call_response':
                await self.handle_call_response(data)
            elif message_type == 'webrtc_signal':
                await self.handle_webrtc_signal(data)
            elif message_type == 'call_end':
                await self.handle_call_end(data)
            else:
                logger.warning(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON'
            }))
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Server error'
            }))

    async def handle_call_initiate(self, data):
        receiver_id = data.get('receiver_id')
        if not receiver_id:
            logger.warning("Call initiate missing receiver_id")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Missing receiver_id'
            }))
            return
            
        try:
            # Check if receiver exists
            receiver_exists = await self.check_user_exists(receiver_id)
            if not receiver_exists:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Receiver not found'
                }))
                return
            
            # Create call record
            call = await self.create_call(self.user.id, receiver_id)
            logger.info(f"Created call {call.id} from {self.user.username} to user {receiver_id}")
            
            # Send call invitation to receiver
            await self.channel_layer.group_send(
                f"video_call_user_{receiver_id}",
                {
                    'type': 'incoming_call',
                    'call_id': call.id,
                    'caller_id': self.user.id,
                    'caller_username': self.user.username,
                }
            )
            
            # Confirm to caller that call was initiated
            await self.send(text_data=json.dumps({
                'type': 'call_initiated',
                'call_id': call.id,
                'receiver_id': receiver_id
            }))
            
        except Exception as e:
            logger.error(f"Error initiating call: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Failed to initiate call'
            }))

    async def handle_call_response(self, data):
        call_id = data.get('call_id')
        accepted = data.get('accepted', False)
        
        if not call_id:
            logger.warning("Call response missing call_id")
            return
        
        try:
            call = await self.get_call(call_id)
            if not call:
                logger.warning(f"Call {call_id} not found")
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Call not found'
                }))
                return
                
            # Update call status
            status = 'accepted' if accepted else 'declined'
            await self.update_call_status(call_id, status)
            logger.info(f"Call {call_id} {status} by {self.user.username}")
            
            # Notify caller
            await self.channel_layer.group_send(
                f"video_call_user_{call.caller.id}",
                {
                    'type': 'call_response',
                    'call_id': call_id,
                    'accepted': accepted,
                    'responder_id': self.user.id,
                    'responder_username': self.user.username
                }
            )
        except Exception as e:
            logger.error(f"Error handling call response: {e}")

    async def handle_webrtc_signal(self, data):
        target_user_id = data.get('target_user_id')
        signal_data = data.get('signal_data')
        
        if target_user_id and signal_data:
            try:
                await self.channel_layer.group_send(
                    f"video_call_user_{target_user_id}",
                    {
                        'type': 'webrtc_signal',
                        'signal_data': signal_data,
                        'from_user_id': self.user.id
                    }
                )
                logger.debug(f"Sent WebRTC signal from {self.user.id} to {target_user_id}")
            except Exception as e:
                logger.error(f"Error sending WebRTC signal: {e}")

    async def handle_call_end(self, data):
        call_id = data.get('call_id')
        target_user_id = data.get('target_user_id')
        
        try:
            if call_id:
                await self.update_call_status(call_id, 'ended')
                logger.info(f"Call {call_id} ended by {self.user.username}")
            
            if target_user_id:
                await self.channel_layer.group_send(
                    f"video_call_user_{target_user_id}",
                    {
                        'type': 'call_ended',
                        'call_id': call_id,
                        'ended_by': self.user.username
                    }
                )
        except Exception as e:
            logger.error(f"Error handling call end: {e}")

    # WebSocket message handlers
    async def incoming_call(self, event):
        await self.send(text_data=json.dumps({
            'type': 'incoming_call',
            'call_id': event['call_id'],
            'caller_id': event['caller_id'],
            'caller_username': event['caller_username'],
        }))

    async def call_response(self, event):
        await self.send(text_data=json.dumps({
            'type': 'call_response',
            'call_id': event['call_id'],
            'accepted': event['accepted'],
            'responder_id': event['responder_id'],
            'responder_username': event['responder_username']
        }))

    async def webrtc_signal(self, event):
        await self.send(text_data=json.dumps({
            'type': 'webrtc_signal',
            'signal_data': event['signal_data'],
            'from_user_id': event['from_user_id']
        }))

    async def call_ended(self, event):
        await self.send(text_data=json.dumps({
            'type': 'call_ended',
            'call_id': event['call_id'],
            'ended_by': event['ended_by']
        }))

    @database_sync_to_async
    def check_user_exists(self, user_id):
        try:
            return User.objects.filter(id=user_id).exists()
        except Exception:
            return False

    @database_sync_to_async
    def create_call(self, caller_id, receiver_id):
        try:
            return VideoCall.objects.create(
                caller_id=caller_id,
                receiver_id=receiver_id,
                status='pending'
            )
        except Exception as e:
            logger.error(f"Error creating call: {e}")
            raise

    @database_sync_to_async
    def get_call(self, call_id):
        try:
            return VideoCall.objects.select_related('caller', 'receiver').get(id=call_id)
        except VideoCall.DoesNotExist:
            return None
        except Exception as e:
            logger.error(f"Error getting call: {e}")
            return None

    @database_sync_to_async
    def update_call_status(self, call_id, status):
        try:
            call = VideoCall.objects.filter(id=call_id).first()
            if call:
                call.status = status
                if status == 'accepted' and not call.started_at:
                    call.started_at = timezone.now()
                elif status == 'ended' and not call.ended_at:
                    call.ended_at = timezone.now()
                    if call.started_at:
                        duration = (call.ended_at - call.started_at).total_seconds()
                        call.duration = int(duration)
                call.save()
                logger.info(f"Updated call {call_id} status to {status}")
        except Exception as e:
            logger.error(f"Error updating call status: {e}")