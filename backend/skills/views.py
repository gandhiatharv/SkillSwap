# backend/skills/views.py
from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets, permissions, filters, generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
import traceback

from .models import (
    CustomUser, Skill, UserSkill, Match, 
    Conversation, Message, UserActivity, VideoCall, Feedback
)
from .serializers import (
    CustomUserSerializer, SkillSerializer, UserSkillSerializer,
    MatchSerializer, RegisterSerializer, ConversationSerializer,
    ConversationDetailSerializer, UserActivitySerializer,
    VideoCallSerializer, MessageSerializer, FeedbackSerializer
)

User = get_user_model()


# ==================== Authentication Views ====================

class CurrentUserView(generics.RetrieveAPIView):
    """Get current authenticated user information"""
    serializer_class = CustomUserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user


class RegisterView(generics.CreateAPIView):
    """Public endpoint for creating a new user account"""
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


# ==================== Skill Views ====================

class SkillViewSet(viewsets.ReadOnlyModelViewSet):
    """Public read-only list/detail of skills"""
    queryset = Skill.objects.all().order_by('name')
    serializer_class = SkillSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'category', 'subcategory']
    ordering_fields = ['name', 'category']


class CustomUserViewSet(viewsets.ModelViewSet):
    """User management endpoints"""
    queryset = CustomUser.objects.all()
    serializer_class = CustomUserSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        return super().get_permissions()


# ==================== User Skill Views ====================

class UserSkillViewSet(viewsets.ModelViewSet):
    """
    Manage user's teach/learn skills with hierarchical matching.
    Creates three tiers of matches:
    - Tier 1 (exact): Exact skill matches
    - Tier 2 (subcategory): Same subcategory matches  
    - Tier 3 (category): Same category matches
    """
    serializer_class = UserSkillSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserSkill.objects.filter(
            user=self.request.user
        ).select_related('skill')

    def perform_create(self, serializer):
        instance = serializer.save(user=self.request.user)
        user = instance.user
        skill = instance.skill

        if instance.type == 'teach':
            self._create_matches_for_teacher(user, skill)
        elif instance.type == 'learn':
            self._create_matches_for_learner(user, skill)

    def perform_destroy(self, instance):
        """
        When a UserSkill is deleted, remove all related matches
        This ensures that when a user removes a skill, they no longer
        show up as a match for that skill
        """
        user = instance.user
        skill = instance.skill
        skill_type = instance.type
        
        print(f"[UserSkill Delete] User: {user.username}, Skill: {skill.name}, Type: {skill_type}")
        
        # Delete matches based on the type being deleted
        if skill_type == 'teach':
            # User was teaching this skill, so they were the 'teacher' in matches
            # Delete all matches where:
            # 1. User is the teacher AND
            # 2. The teacher_skill matches the deleted skill OR
            # 3. The skill (what learner wants) matches and it's an exact match
            deleted_exact = Match.objects.filter(
                teacher=user,
                skill=skill,
                teacher_skill=skill,
                match_tier='exact'
            ).delete()
            
            deleted_sub_cat = Match.objects.filter(
                teacher=user,
                teacher_skill=skill,
                match_tier__in=['subcategory', 'category']
            ).delete()
            
            print(f"[UserSkill Delete] Deleted {deleted_exact[0]} exact matches")
            print(f"[UserSkill Delete] Deleted {deleted_sub_cat[0]} subcategory/category matches")
            
        elif skill_type == 'learn':
            # User was learning this skill, so they were the 'learner' in matches
            # Delete all matches where:
            # 1. User is the learner AND
            # 2. The skill (what they want to learn) matches the deleted skill
            deleted = Match.objects.filter(
                learner=user,
                skill=skill
            ).delete()
            
            print(f"[UserSkill Delete] Deleted {deleted[0]} matches where user was learner")
        
        # Now delete the UserSkill instance
        instance.delete()
        print(f"[UserSkill Delete] UserSkill deleted successfully")

    def _create_matches_for_teacher(self, user, skill):
        """Create matches when user adds a skill they can teach"""
        
        # TIER 1: Exact skill matches
        exact_learners = UserSkill.objects.filter(
            skill=skill, 
            type='learn'
        ).exclude(user=user).select_related('user')
        
        for learner_us in exact_learners:
            learner = learner_us.user
            match, created = Match.objects.get_or_create(
                learner=learner,
                teacher=user,
                skill=skill,
                teacher_skill=skill,
                defaults={'match_tier': 'exact', 'is_mutual': False}
            )
            self._check_and_set_mutual(match, learner, user)
        
        # TIER 2: Subcategory matches (if skill has subcategory)
        if skill.subcategory:
            subcategory_skills = Skill.objects.filter(
                subcategory=skill.subcategory
            ).exclude(id=skill.id)
            
            subcategory_learners = UserSkill.objects.filter(
                skill__in=subcategory_skills,
                type='learn'
            ).exclude(user=user).select_related('user', 'skill')
            
            for learner_us in subcategory_learners:
                learner = learner_us.user
                learner_skill = learner_us.skill
                match, created = Match.objects.get_or_create(
                    learner=learner,
                    teacher=user,
                    skill=learner_skill,
                    teacher_skill=skill,
                    defaults={'match_tier': 'subcategory', 'is_mutual': False}
                )
                self._check_and_set_mutual(match, learner, user)
        
        # TIER 3: Category matches
        if skill.category:
            category_skills = Skill.objects.filter(
                category=skill.category
            ).exclude(id=skill.id)
            
            # Exclude subcategory matches we already created
            if skill.subcategory:
                category_skills = category_skills.exclude(subcategory=skill.subcategory)
            
            category_learners = UserSkill.objects.filter(
                skill__in=category_skills,
                type='learn'
            ).exclude(user=user).select_related('user', 'skill')
            
            for learner_us in category_learners:
                learner = learner_us.user
                learner_skill = learner_us.skill
                match, created = Match.objects.get_or_create(
                    learner=learner,
                    teacher=user,
                    skill=learner_skill,
                    teacher_skill=skill,
                    defaults={'match_tier': 'category', 'is_mutual': False}
                )
                self._check_and_set_mutual(match, learner, user)

    def _create_matches_for_learner(self, user, skill):
        """Create matches when user adds a skill they want to learn"""
        
        # TIER 1: Exact skill matches
        exact_teachers = UserSkill.objects.filter(
            skill=skill,
            type='teach'
        ).exclude(user=user).select_related('user')
        
        for teacher_us in exact_teachers:
            teacher = teacher_us.user
            match, created = Match.objects.get_or_create(
                learner=user,
                teacher=teacher,
                skill=skill,
                teacher_skill=skill,
                defaults={'match_tier': 'exact', 'is_mutual': False}
            )
            self._check_and_set_mutual(match, user, teacher)
        
        # TIER 2: Subcategory matches
        if skill.subcategory:
            subcategory_skills = Skill.objects.filter(
                subcategory=skill.subcategory
            ).exclude(id=skill.id)
            
            subcategory_teachers = UserSkill.objects.filter(
                skill__in=subcategory_skills,
                type='teach'
            ).exclude(user=user).select_related('user', 'skill')
            
            for teacher_us in subcategory_teachers:
                teacher = teacher_us.user
                teacher_skill = teacher_us.skill
                match, created = Match.objects.get_or_create(
                    learner=user,
                    teacher=teacher,
                    skill=skill,
                    teacher_skill=teacher_skill,
                    defaults={'match_tier': 'subcategory', 'is_mutual': False}
                )
                self._check_and_set_mutual(match, user, teacher)
        
        # TIER 3: Category matches
        if skill.category:
            category_skills = Skill.objects.filter(
                category=skill.category
            ).exclude(id=skill.id)
            
            if skill.subcategory:
                category_skills = category_skills.exclude(subcategory=skill.subcategory)
            
            category_teachers = UserSkill.objects.filter(
                skill__in=category_skills,
                type='teach'
            ).exclude(user=user).select_related('user', 'skill')
            
            for teacher_us in category_teachers:
                teacher = teacher_us.user
                teacher_skill = teacher_us.skill
                match, created = Match.objects.get_or_create(
                    learner=user,
                    teacher=teacher,
                    skill=skill,
                    teacher_skill=teacher_skill,
                    defaults={'match_tier': 'category', 'is_mutual': False}
                )
                self._check_and_set_mutual(match, user, teacher)

    def _check_and_set_mutual(self, match, learner, teacher):
        """Check if match should be marked as mutual"""
        learner_teach_skills = set(
            UserSkill.objects.filter(user=learner, type='teach')
            .values_list('skill_id', flat=True)
        )
        teacher_learn_skills = set(
            UserSkill.objects.filter(user=teacher, type='learn')
            .values_list('skill_id', flat=True)
        )
        
        complementary = learner_teach_skills & teacher_learn_skills
        
        if complementary and not match.is_mutual:
            match.is_mutual = True
            match.save()
            
            # Create reverse matches for complementary skills
            for comp_skill_id in complementary:
                comp_skill = Skill.objects.get(id=comp_skill_id)
                reverse_match, _ = Match.objects.get_or_create(
                    learner=teacher,
                    teacher=learner,
                    skill=comp_skill,
                    teacher_skill=comp_skill,
                    defaults={'match_tier': 'exact', 'is_mutual': True}
                )
                if not reverse_match.is_mutual:
                    reverse_match.is_mutual = True
                    reverse_match.save()


# ==================== Match Views ====================

class MatchViewSet(viewsets.ReadOnlyModelViewSet):
    """Return matches for the logged-in user, ordered by match quality"""
    serializer_class = MatchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Get all matches for the current user"""
        user = self.request.user
        return Match.objects.filter(
            Q(learner=user) | Q(teacher=user)
        ).select_related('learner', 'teacher', 'skill', 'teacher_skill')

    def list(self, request, *args, **kwargs):
        """Override list to provide custom sorting"""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Sort by match quality: mutual first, then by tier, then by date
        tier_order = {'exact': 1, 'subcategory': 2, 'category': 3}
        matches_list = list(queryset)
        matches_list.sort(
            key=lambda m: (
                not m.is_mutual,
                tier_order.get(m.match_tier, 99),
                -m.created_at.timestamp()
            )
        )
        
        serializer = self.get_serializer(matches_list, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='start_conversation')
    def start_conversation(self, request, pk=None):
        """
        Start a conversation from a match
        POST /api/matches/{id}/start_conversation/
        """
        try:
            match = self.get_object()
            current_user = request.user
            
            # Determine the other user
            if match.learner == current_user:
                other_user = match.teacher
            elif match.teacher == current_user:
                other_user = match.learner
            else:
                return Response(
                    {'error': 'You are not part of this match'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get or create conversation
            conversation, created = Conversation.get_or_create_conversation(
                current_user, other_user
            )
            
            serializer = ConversationSerializer(
                conversation, 
                context={'request': request}
            )
            
            return Response({
                'conversation': serializer.data,
                'created': created,
                'message': 'Conversation created successfully' if created else 'Existing conversation found'
            }, status=status.HTTP_200_OK)
                
        except Exception as e:
            return Response(
                {'error': f'Error starting conversation: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ==================== Messaging Views ====================

class ConversationViewSet(viewsets.ModelViewSet):
    """Manage conversations between users"""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Conversation.objects.filter(
            Q(user1=user) | Q(user2=user)
        ).select_related('user1', 'user2').order_by('-updated_at')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ConversationDetailSerializer
        return ConversationSerializer

    def create(self, request, *args, **kwargs):
        """
        Create a conversation with another user
        POST /api/conversations/
        Body: {"other_user_id": 123}
        """
        other_user_id = request.data.get('other_user_id')
        if not other_user_id:
            return Response(
                {'error': 'other_user_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            other_user = CustomUser.objects.get(id=other_user_id)
        except CustomUser.DoesNotExist:
            return Response(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

        if other_user == request.user:
            return Response(
                {'error': 'Cannot create conversation with yourself'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        conversation, created = Conversation.get_or_create_conversation(
            request.user, other_user
        )

        serializer = ConversationDetailSerializer(
            conversation, 
            context={'request': request}
        )
        
        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(serializer.data, status=status_code)

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """
        Mark all messages in this conversation as read
        POST /api/conversations/{id}/mark_as_read/
        """
        conversation = self.get_object()
        
        # Mark all unread messages from the other user as read
        Message.objects.filter(
            conversation=conversation,
            is_read=False
        ).exclude(
            sender=request.user
        ).update(is_read=True)
        
        return Response({'message': 'Messages marked as read'})


class MessageViewSet(viewsets.ModelViewSet):
    """Manage messages within conversations"""
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Only return messages from conversations the user is part of
        user_conversations = Conversation.objects.filter(
            Q(user1=user) | Q(user2=user)
        )
        return Message.objects.filter(
            conversation__in=user_conversations
        ).select_related('sender', 'conversation').order_by('created_at')

    def perform_create(self, serializer):
        """Create a new message and verify user is part of the conversation"""
        conversation = serializer.validated_data['conversation']
        user = self.request.user
        
        # Verify user is part of this conversation
        if not (conversation.user1 == user or conversation.user2 == user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You are not part of this conversation")
        
        serializer.save(sender=user)

    def create(self, request, *args, **kwargs):
        """Override create to update conversation timestamp"""
        response = super().create(request, *args, **kwargs)
        
        if response.status_code == status.HTTP_201_CREATED:
            # Update the conversation's updated_at timestamp
            message = Message.objects.get(id=response.data['id'])
            message.conversation.save()  # Triggers updated_at
            
        return response


# ==================== Activity & Video Call Views ====================

class UserActivityViewSet(viewsets.ReadOnlyModelViewSet):
    """Get online users and activity status"""
    serializer_class = UserActivitySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserActivity.objects.filter(
            is_online=True
        ).select_related('user')

    @action(detail=False, methods=['get'])
    def online_matches(self, request):
        """Get currently online users who are matches with the current user"""
        user = request.user
        
        try:
            # Get user's matches
            matches = Match.objects.filter(
                Q(learner=user) | Q(teacher=user)
            ).select_related('learner', 'teacher')
            
            # Get match user IDs (excluding current user)
            match_user_ids = set()
            for match in matches:
                if match.learner.id != user.id:
                    match_user_ids.add(match.learner.id)
                if match.teacher.id != user.id:
                    match_user_ids.add(match.teacher.id)
            
            # Get online activities for match users
            online_activities = UserActivity.objects.filter(
                user_id__in=match_user_ids,
                is_online=True
            ).select_related('user')
            
            serializer = self.get_serializer(online_activities, many=True)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to load online matches: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VideoCallViewSet(viewsets.ModelViewSet):
    """Manage video calls between users"""
    serializer_class = VideoCallSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        return VideoCall.objects.filter(
            Q(caller=user) | Q(receiver=user)
        ).select_related('caller', 'receiver').order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def accept_call(self, request, pk=None):
        """Accept an incoming call"""
        call = self.get_object()
        
        if call.receiver != request.user:
            return Response(
                {'error': 'Not authorized'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        call.status = 'accepted'
        call.started_at = timezone.now()
        call.save()
        
        serializer = self.get_serializer(call)
        return Response({
            'message': 'Call accepted',
            'call': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def decline_call(self, request, pk=None):
        """Decline an incoming call"""
        call = self.get_object()
        
        if call.receiver != request.user:
            return Response(
                {'error': 'Not authorized'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        call.status = 'declined'
        call.save()
        
        serializer = self.get_serializer(call)
        return Response({
            'message': 'Call declined',
            'call': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def end_call(self, request, pk=None):
        """End an active call"""
        call = self.get_object()
        
        if call.caller != request.user and call.receiver != request.user:
            return Response(
                {'error': 'Not authorized'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        call.status = 'ended'
        call.ended_at = timezone.now()
        
        # Calculate duration if call was started
        if call.started_at:
            duration = (call.ended_at - call.started_at).total_seconds()
            call.duration = int(duration)
        
        call.save()
        
        serializer = self.get_serializer(call)
        return Response({
            'message': 'Call ended',
            'call': serializer.data
        })


# ==================== Feedback Views ====================

class FeedbackViewSet(viewsets.ModelViewSet):
    """Manage user feedback submissions"""
    serializer_class = FeedbackSerializer
    permission_classes = [permissions.AllowAny]  # Allow anonymous feedback
    
    def get_queryset(self):
        # Admin users can see all feedback
        if self.request.user.is_authenticated and self.request.user.is_staff:
            return Feedback.objects.all()
        # Regular users can only see their own feedback
        elif self.request.user.is_authenticated:
            return Feedback.objects.filter(user=self.request.user)
        # Anonymous users can't list feedback
        return Feedback.objects.none()
    
    def get_permissions(self):
        # Only allow create and list actions for non-authenticated users
        if self.action == 'create':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]
    




# Add these imports at the top if not already there
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from pathlib import Path
import json

# Add this view at the bottom
@api_view(['GET'])
@permission_classes([AllowAny])
def load_skills_data(request):
    """One-time endpoint to load skills - DELETE AFTER USE"""
    json_path = Path(__file__).resolve().parent / 'skills.json'
    
    if not json_path.exists():
        return Response({'error': f'File not found at {json_path}'}, status=404)
    
    with open(json_path, 'r', encoding='utf-8') as f:
        skills_data = json.load(f)
    
    created = 0
    skipped = 0
    
    for skill in skills_data:
        obj, created_now = Skill.objects.get_or_create(
            name=skill['name'],
            defaults={
                'category': skill.get('category', ''),
                'subcategory': skill.get('subcategory', '')
            }
        )
        if created_now:
            created += 1
        else:
            skipped += 1
    
    return Response({
        'status': 'success',
        'created': created,
        'skipped': skipped,
        'total': Skill.objects.count()
    })