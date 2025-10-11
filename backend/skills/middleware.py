import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from urllib.parse import parse_qs
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

@database_sync_to_async
def get_user_from_token(token):
    """Get user from JWT token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        user_id = payload.get('user_id')
        
        if user_id:
            user = User.objects.get(id=user_id)
            logger.info(f"✅ WebSocket authenticated user: {user.username}")
            return user
        else:
            logger.warning("⚠️ No user_id in token payload")
            return AnonymousUser()
            
    except jwt.ExpiredSignatureError:
        logger.warning("⚠️ JWT token expired")
        return AnonymousUser()
    except jwt.InvalidTokenError as e:
        logger.warning(f"⚠️ Invalid JWT token: {e}")
        return AnonymousUser()
    except User.DoesNotExist:
        logger.warning(f"⚠️ User with id {user_id} not found")
        return AnonymousUser()
    except Exception as e:
        logger.error(f"❌ Error getting user from token: {e}")
        return AnonymousUser()

class JwtAuthMiddleware(BaseMiddleware):
    """Custom middleware for JWT authentication in WebSocket connections"""
    
    async def __call__(self, scope, receive, send):
        # Extract token from query parameters
        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        
        token = None
        if 'token' in query_params:
            token = query_params['token'][0]
        
        if token:
            user = await get_user_from_token(token)
            scope['user'] = user
        else:
            logger.warning("⚠️ No token provided in WebSocket connection")
            scope['user'] = AnonymousUser()
        
        return await super().__call__(scope, receive, send)