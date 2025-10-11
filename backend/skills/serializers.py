# backend/skills/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    CustomUser, Skill, UserSkill, Match, 
    Conversation, Message, UserActivity, VideoCall, Feedback
)

User = get_user_model()


# ==================== User Serializers ====================

class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(
        write_only=True, 
        required=True, 
        min_length=6,
        style={'input_type': 'password'}
    )
    password2 = serializers.CharField(
        write_only=True, 
        required=True,
        label="Confirm password",
        style={'input_type': 'password'}
    )

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'password2']
        extra_kwargs = {
            'email': {'required': True},
            'username': {'required': True}
        }

    def validate_email(self, value):
        """Ensure email is unique"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_username(self, value):
        """Ensure username is unique"""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate(self, data):
        """Validate that passwords match"""
        if data.get('password') != data.get('password2'):
            raise serializers.ValidationError({
                "password": "Passwords do not match."
            })
        return data

    def create(self, validated_data):
        """Create new user with hashed password"""
        # Remove password2 as it's not needed for user creation
        validated_data.pop('password2', None)
        password = validated_data.pop('password')
        
        # Create user instance
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        
        return user


class CustomUserSerializer(serializers.ModelSerializer):
    """Basic user information serializer"""
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'bio', 'location', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class CustomUserDetailSerializer(serializers.ModelSerializer):
    """Detailed user information including skills"""
    teach_skills = serializers.SerializerMethodField()
    learn_skills = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'bio', 'location', 
            'date_joined', 'teach_skills', 'learn_skills'
        ]
        read_only_fields = ['id', 'date_joined']
    
    def get_teach_skills(self, obj):
        """Get skills user can teach"""
        skills = UserSkill.objects.filter(
            user=obj, 
            type='teach'
        ).select_related('skill')
        return [{'id': us.skill.id, 'name': us.skill.name} for us in skills]
    
    def get_learn_skills(self, obj):
        """Get skills user wants to learn"""
        skills = UserSkill.objects.filter(
            user=obj, 
            type='learn'
        ).select_related('skill')
        return [{'id': us.skill.id, 'name': us.skill.name} for us in skills]


# ==================== Skill Serializers ====================

class SkillSerializer(serializers.ModelSerializer):
    """Serializer for skill information"""
    class Meta:
        model = Skill
        fields = ['id', 'name', 'category', 'subcategory']
        read_only_fields = ['id']


class UserSkillSerializer(serializers.ModelSerializer):
    """Serializer for user's teach/learn skills"""
    skill_detail = SkillSerializer(source='skill', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = UserSkill
        fields = ['id', 'user_id', 'username', 'skill', 'skill_detail', 'type']
        read_only_fields = ['id', 'user_id', 'username']

    def validate(self, data):
        """Prevent duplicate skill entries"""
        request = self.context.get('request')
        if request and request.user:
            skill = data.get('skill')
            skill_type = data.get('type')
            
            # Check if this combination already exists
            if UserSkill.objects.filter(
                user=request.user,
                skill=skill,
                type=skill_type
            ).exists():
                raise serializers.ValidationError(
                    f"You have already added this skill to your {skill_type} list."
                )
        
        return data


# ==================== Match Serializers ====================

class MatchSerializer(serializers.ModelSerializer):
    """Serializer for skill matches between users"""
    learner = CustomUserSerializer(read_only=True)
    teacher = CustomUserSerializer(read_only=True)
    skill = SkillSerializer(read_only=True)
    teacher_skill = SkillSerializer(read_only=True)
    match_tier_display = serializers.SerializerMethodField()
    match_quality = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = [
            'id', 'learner', 'teacher', 'skill', 'teacher_skill', 
            'match_tier', 'match_tier_display', 'match_quality',
            'is_mutual', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_match_tier_display(self, obj):
        """Get human-readable match tier with emoji"""
        tier_info = {
            'exact': '⭐ Exact Match',
            'subcategory': '🎯 Subcategory Match',
            'category': '📂 Category Match'
        }
        return tier_info.get(obj.match_tier, 'Match')
    
    def get_match_quality(self, obj):
        """Calculate match quality score (0-100)"""
        if obj.is_mutual:
            base_score = 100
        else:
            base_score = 70
        
        # Adjust based on tier
        tier_adjustments = {
            'exact': 0,
            'subcategory': -15,
            'category': -30
        }
        
        return max(0, base_score + tier_adjustments.get(obj.match_tier, 0))


# ==================== Messaging Serializers ====================

class MessageSerializer(serializers.ModelSerializer):
    """Serializer for individual messages"""
    sender = CustomUserSerializer(read_only=True)
    sender_id = serializers.IntegerField(source='sender.id', read_only=True)
    sender_username = serializers.CharField(source='sender.username', read_only=True)

    class Meta:
        model = Message
        fields = [
            'id', 'conversation', 'sender', 'sender_id', 
            'sender_username', 'content', 'created_at', 'is_read'
        ]
        read_only_fields = ['id', 'sender', 'sender_id', 'sender_username', 'created_at']

    def validate_content(self, value):
        """Ensure message content is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Message content cannot be empty.")
        return value.strip()


class ConversationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for conversation list view"""
    other_user = serializers.SerializerMethodField()
    last_message_preview = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'other_user', 'last_message_preview', 
            'unread_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_other_user(self, obj):
        """Get the other user in the conversation"""
        request = self.context.get('request')
        if not request or not request.user:
            return None
        other_user = obj.get_other_user(request.user)
        return {
            'id': other_user.id,
            'username': other_user.username,
            'email': other_user.email
        }

    def get_last_message_preview(self, obj):
        """Get preview of last message"""
        try:
            last_message = obj.messages.order_by('-created_at').first()
            if last_message:
                content = last_message.content
                preview = content[:50] + '...' if len(content) > 50 else content
                return {
                    'id': last_message.id,
                    'preview': preview,
                    'sender_id': last_message.sender.id,
                    'created_at': last_message.created_at,
                    'is_read': last_message.is_read
                }
        except Exception:
            pass
        return None

    def get_unread_count(self, obj):
        """Count unread messages for current user"""
        try:
            request = self.context.get('request')
            if not request or not request.user:
                return 0
            return obj.messages.filter(
                is_read=False
            ).exclude(
                sender=request.user
            ).count()
        except Exception:
            return 0


class ConversationDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for conversation with all messages"""
    user1 = CustomUserSerializer(read_only=True)
    user2 = CustomUserSerializer(read_only=True)
    other_user = serializers.SerializerMethodField()
    messages = MessageSerializer(many=True, read_only=True)
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'user1', 'user2', 'other_user', 
            'messages', 'unread_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_other_user(self, obj):
        """Get detailed info about the other user"""
        request = self.context.get('request')
        if not request or not request.user:
            return None
        other_user = obj.get_other_user(request.user)
        return CustomUserSerializer(other_user).data
    
    def get_unread_count(self, obj):
        """Count unread messages for current user"""
        try:
            request = self.context.get('request')
            if not request or not request.user:
                return 0
            return obj.messages.filter(
                is_read=False
            ).exclude(
                sender=request.user
            ).count()
        except Exception:
            return 0


# ==================== Activity & Call Serializers ====================

class UserActivitySerializer(serializers.ModelSerializer):
    """Serializer for user online/activity status"""
    user = CustomUserSerializer(read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = UserActivity
        fields = [
            'id', 'user', 'user_id', 'username', 
            'is_online', 'last_seen', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'user_id', 'username', 'last_seen', 'created_at', 'updated_at']


class VideoCallSerializer(serializers.ModelSerializer):
    """Serializer for video call records"""
    caller = CustomUserSerializer(read_only=True)
    receiver = CustomUserSerializer(read_only=True)
    caller_id = serializers.IntegerField(source='caller.id', read_only=True)
    receiver_id = serializers.IntegerField(source='receiver.id', read_only=True)
    duration_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = VideoCall
        fields = [
            'id', 'caller', 'receiver', 'caller_id', 'receiver_id',
            'status', 'created_at', 'started_at', 'ended_at', 
            'duration', 'duration_formatted'
        ]
        read_only_fields = ['id', 'created_at', 'caller', 'receiver', 'caller_id', 'receiver_id']
    
    def get_duration_formatted(self, obj):
        """Format duration as human-readable string"""
        if not obj.duration:
            return None
        
        minutes = obj.duration // 60
        seconds = obj.duration % 60
        
        if minutes > 0:
            return f"{minutes}m {seconds}s"
        return f"{seconds}s"


# ==================== Feedback Serializer ====================

class FeedbackSerializer(serializers.ModelSerializer):
    """Serializer for user feedback submissions"""
    user_username = serializers.CharField(source='user.username', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    
    class Meta:
        model = Feedback
        fields = [
            'id', 'user', 'user_username', 'name', 'email', 
            'category', 'category_display', 'rating', 'feedback', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'user_username', 'created_at']
    
    def validate_rating(self, value):
        """Ensure rating is between 1 and 5"""
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value
    
    def validate_feedback(self, value):
        """Ensure feedback is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Feedback cannot be empty.")
        return value.strip()
    
    def create(self, validated_data):
        """Associate with logged-in user if authenticated"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user'] = request.user
        return super().create(validated_data)


# ==================== Backward Compatibility Alias ====================
# Create alias for ConversationSerializer to match views.py imports
ConversationSerializer = ConversationListSerializer