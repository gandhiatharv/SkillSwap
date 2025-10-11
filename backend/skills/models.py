# backend/skills/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class CustomUser(AbstractUser):
    """Extended user model with additional profile fields"""
    bio = models.TextField(blank=True)
    location = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return self.username


class Skill(models.Model):
    """Skills that can be taught or learned"""
    name = models.CharField(max_length=255, unique=True)
    category = models.CharField(max_length=255, blank=True, null=True)
    subcategory = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return self.name


class UserSkill(models.Model):
    """Links users to skills they can teach or want to learn"""
    SKILL_TYPE_CHOICES = (
        ('teach', 'Can Teach'),
        ('learn', 'Wants to Learn'),
    )

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='user_skills')
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name='user_skills')
    type = models.CharField(max_length=5, choices=SKILL_TYPE_CHOICES)

    class Meta:
        unique_together = ('user', 'skill', 'type')
        ordering = ['skill__name']

    def __str__(self):
        return f"{self.user.username} - {self.type} - {self.skill.name}"


class Match(models.Model):
    """Represents a potential learning match between two users"""
    TIER_CHOICES = [
        ('exact', 'Exact Skill Match'),
        ('subcategory', 'Subcategory Match'),
        ('category', 'Category Match'),
    ]
    
    learner = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='matches_as_learner')
    teacher = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='matches_as_teacher')
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name='matches_for_skill')
    teacher_skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name='teacher_matches', null=True, blank=True)
    match_tier = models.CharField(max_length=12, choices=TIER_CHOICES, default='exact')
    is_mutual = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['learner', 'teacher', 'match_tier']),
            models.Index(fields=['match_tier', 'is_mutual']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        tier_icon = {'exact': 'EXACT', 'subcategory': 'SUBCAT', 'category': 'CAT'}.get(self.match_tier, '')
        return f"[{tier_icon}] {self.learner.username} <-> {self.teacher.username} ({self.skill.name})"


class Conversation(models.Model):
    """Represents a conversation between two users"""
    user1 = models.ForeignKey(
        CustomUser, 
        on_delete=models.CASCADE, 
        related_name='conversations_as_user1'
    )
    user2 = models.ForeignKey(
        CustomUser, 
        on_delete=models.CASCADE, 
        related_name='conversations_as_user2'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user1', 'user2')
        ordering = ['-updated_at']

    def __str__(self):
        return f"Conversation between {self.user1.username} and {self.user2.username}"

    def get_other_user(self, user):
        """Returns the other user in the conversation"""
        if user == self.user1:
            return self.user2
        return self.user1

    @classmethod
    def get_or_create_conversation(cls, user1, user2):
        """Get or create a conversation between two users"""
        # Always store users in consistent order (lower ID first)
        if user1.id > user2.id:
            user1, user2 = user2, user1
        
        conversation, created = cls.objects.get_or_create(
            user1=user1,
            user2=user2
        )
        return conversation, created


class Message(models.Model):
    """Individual message within a conversation"""
    conversation = models.ForeignKey(
        Conversation, 
        on_delete=models.CASCADE, 
        related_name='messages'
    )
    sender = models.ForeignKey(
        CustomUser, 
        on_delete=models.CASCADE, 
        related_name='sent_messages'
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender.username}: {self.content[:50]}..."

    def save(self, *args, **kwargs):
        """Auto-update conversation timestamp when message is saved"""
        super().save(*args, **kwargs)
        self.conversation.updated_at = self.created_at
        self.conversation.save(update_fields=['updated_at'])


class UserActivity(models.Model):
    """Tracks user online status and last seen time"""
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='activity')
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(auto_now=True)
    socket_id = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name_plural = "User Activities"
        ordering = ['-last_seen']
    
    def __str__(self):
        return f"{self.user.username} - {'Online' if self.is_online else 'Offline'}"


class VideoCall(models.Model):
    """Records video call sessions between users"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('ended', 'Ended'),
    ]
    
    caller = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='calls_made')
    receiver = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='calls_received')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    duration = models.IntegerField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Call from {self.caller.username} to {self.receiver.username} - {self.status}"


class Feedback(models.Model):
    """User feedback and feature requests"""
    CATEGORY_CHOICES = [
        ('general', 'General Feedback'),
        ('bug', 'Bug Report'),
        ('feature', 'Feature Request'),
        ('matching', 'Matching Algorithm'),
        ('ui', 'User Interface'),
        ('other', 'Other'),
    ]
    
    user = models.ForeignKey(
        CustomUser, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='feedback_submissions'
    )
    name = models.CharField(max_length=200)
    email = models.EmailField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='general')
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)], default=5)
    feedback = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Feedback'
    
    def __str__(self):
        return f"{self.name} - {self.category} ({self.rating}★)"