from django.contrib import admin
from .models import Skill, UserSkill, Match, CustomUser, Conversation, Message
from django.contrib.auth.admin import UserAdmin
from .models import UserActivity, VideoCall

# Register your models here
admin.site.register(Skill)
admin.site.register(UserSkill)
admin.site.register(Match)

# For CustomUser, use UserAdmin to get the default user admin UI
admin.site.register(CustomUser, UserAdmin)


# Messaging Admin
@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user1', 'user2', 'created_at', 'updated_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('user1__username', 'user2__username')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'conversation', 'sender', 'content_preview', 'created_at', 'is_read')
    list_filter = ('created_at', 'is_read')
    search_fields = ('content', 'sender__username')
    readonly_fields = ('created_at',)
    
    def content_preview(self, obj):
        return obj.content[:50] + "..." if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Content Preview'



# Add these imports and admin classes to your existing backend/skills/admin.py


@admin.register(UserActivity)
class UserActivityAdmin(admin.ModelAdmin):
    list_display = ['user', 'is_online', 'last_seen', 'created_at']
    list_filter = ['is_online', 'created_at']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['created_at', 'updated_at', 'last_seen']

@admin.register(VideoCall)
class VideoCallAdmin(admin.ModelAdmin):
    list_display = ['caller', 'receiver', 'status', 'created_at', 'duration']
    list_filter = ['status', 'created_at']
    search_fields = ['caller__username', 'receiver__username']
    readonly_fields = ['created_at', 'started_at', 'ended_at']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('caller', 'receiver')