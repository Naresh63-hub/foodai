import pytest
from django.contrib.auth.models import User
from foodai_backend.firebase_auth import FirebaseAuthenticationBackend
from unittest.mock import Mock, patch
from firebase_admin.auth import ExpiredIdTokenError, InvalidIdTokenError


@pytest.fixture
def firebase_backend():
    return FirebaseAuthenticationBackend()


@pytest.fixture
def mock_request():
    request = Mock()
    request.firebase_token = None
    return request


@pytest.mark.django_db
class TestFirebaseAuthenticationBackend:
    
    def test_authenticate_without_token(self, firebase_backend, mock_request):
        """Test authentication fails when no token is provided"""
        result = firebase_backend.authenticate(mock_request)
        assert result is None
    
    @patch('foodai_backend.firebase_auth.firebase_auth.verify_id_token')
    @pytest.mark.django_db
    def test_authenticate_with_valid_token(self, mock_verify, firebase_backend, mock_request):
        """Test successful authentication with valid token"""
        mock_verify.return_value = {
            'uid': 'test-uid-123',
            'email': 'test@example.com',
            'name': 'Test User'
        }
        mock_request.firebase_token = 'valid-token'
        
        result = firebase_backend.authenticate(mock_request)
        
        assert result is not None
        assert result.username == 'test-uid-123'
        assert result.email == 'test@example.com'
        assert result.first_name == 'Test'
    
    @patch('foodai_backend.firebase_auth.firebase_auth.verify_id_token')
    @pytest.mark.django_db
    def test_authenticate_creates_new_user(self, mock_verify, firebase_backend, mock_request):
        """Test that new user is created when authenticating with new Firebase UID"""
        mock_verify.return_value = {
            'uid': 'new-uid-456',
            'email': 'newuser@example.com',
            'name': 'New User'
        }
        mock_request.firebase_token = 'valid-token'
        
        # Ensure user doesn't exist
        assert not User.objects.filter(username='new-uid-456').exists()
        
        result = firebase_backend.authenticate(mock_request)
        
        assert result is not None
        assert User.objects.filter(username='new-uid-456').exists()
    
    @patch('foodai_backend.firebase_auth.firebase_auth.verify_id_token')
    @pytest.mark.django_db
    def test_authenticate_returns_existing_user(self, mock_verify, firebase_backend, mock_request):
        """Test that existing user is returned when authenticating with existing Firebase UID"""
        # Create user first
        user = User.objects.create_user(
            username='existing-uid-789',
            email='existing@example.com'
        )
        
        mock_verify.return_value = {
            'uid': 'existing-uid-789',
            'email': 'existing@example.com',
        }
        mock_request.firebase_token = 'valid-token'
        
        result = firebase_backend.authenticate(mock_request)
        
        assert result is not None
        assert result.id == user.id
    
    @patch('foodai_backend.firebase_auth.firebase_auth.verify_id_token')
    def test_authenticate_with_expired_token(self, mock_verify, firebase_backend, mock_request):
        """Test authentication fails with expired token"""
        mock_verify.side_effect = ExpiredIdTokenError('Token expired', cause=None)
        mock_request.firebase_token = 'expired-token'
        
        result = firebase_backend.authenticate(mock_request)
        
        assert result is None
    
    @patch('foodai_backend.firebase_auth.firebase_auth.verify_id_token')
    def test_authenticate_with_invalid_token(self, mock_verify, firebase_backend, mock_request):
        """Test authentication fails with invalid token"""
        mock_verify.side_effect = InvalidIdTokenError('Invalid token', cause=None)
        mock_request.firebase_token = 'invalid-token'
        
        result = firebase_backend.authenticate(mock_request)
        
        assert result is None
    
    @patch('foodai_backend.firebase_auth.firebase_auth.verify_id_token')
    def test_authenticate_with_missing_uid(self, mock_verify, firebase_backend, mock_request):
        """Test authentication fails when token has no UID"""
        mock_verify.return_value = {
            'email': 'test@example.com',
            'name': 'Test User'
        }
        mock_request.firebase_token = 'token-without-uid'
        
        result = firebase_backend.authenticate(mock_request)
        
        assert result is None
    
    @pytest.mark.django_db
    def test_get_user(self, firebase_backend):
        """Test get_user method"""
        user = User.objects.create_user(
            username='test-user',
            email='test@example.com'
        )
        
        result = firebase_backend.get_user(user.id)
        
        assert result is not None
        assert result.id == user.id
    
    @pytest.mark.django_db
    def test_get_user_nonexistent(self, firebase_backend):
        """Test get_user with non-existent user"""
        result = firebase_backend.get_user(99999)
        
        assert result is None
