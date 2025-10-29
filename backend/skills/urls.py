# skills/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    SkillViewSet, 
    CustomUserViewSet, 
    UserSkillViewSet, 
    MatchViewSet, 
    RegisterView,
    ConversationViewSet,
    MessageViewSet,
    UserActivityViewSet, 
    VideoCallViewSet,
    CurrentUserView,
    FeedbackViewSet,
)
from .views import load_skills_data

# Create router and register viewsets
router = DefaultRouter()
router.register(r'skills', SkillViewSet, basename='skill')
router.register(r'users', CustomUserViewSet, basename='user')
router.register(r'user-skills', UserSkillViewSet, basename='user-skill')
router.register(r'matches', MatchViewSet, basename='match')
router.register(r'conversations', ConversationViewSet, basename='conversation')
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'user-activity', UserActivityViewSet, basename='user-activity')
router.register(r'video-calls', VideoCallViewSet, basename='video-call')
router.register(r'feedback', FeedbackViewSet, basename='feedback')

# Define URL patterns
urlpatterns = [
    # Auth endpoints
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    #path('load-skills-data/', load_skills_data, name='load-skills-data'),
    # Current user endpoint (must be before router to avoid conflict with users/<id>/)
    path('users/me/', CurrentUserView.as_view(), name='current-user'),
    
    # Include all router URLs
    path('', include(router.urls)),
]