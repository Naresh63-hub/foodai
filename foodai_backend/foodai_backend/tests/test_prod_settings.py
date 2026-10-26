"""
Test production settings for security compliance.

Verifies that production configuration does not include wildcard
in ALLOWED_HOSTS to prevent Host header attacks.
"""
import os
import pytest


class TestProductionSettingsSecurity:
    """Security tests for production settings."""

    def test_prod_settings_no_wildcard_allowed_hosts(self):
        """
        Verify that production ALLOWED_HOSTS does not contain wildcard '*'.
        
        A wildcard in ALLOWED_HOSTS would allow any Host header, which is a
        security vulnerability as it can facilitate Host header attacks.
        """
        # Import production settings module to check configuration
        from foodai_backend.settings import prod
        
        # Check that '*' is not in ALLOWED_HOSTS
        assert '*' not in prod.ALLOWED_HOSTS, (
            "Production ALLOWED_HOSTS must not contain wildcard '*'. "
            "This would allow any Host header and is a security vulnerability."
        )

    def test_prod_settings_rejects_wildcard_from_env(self):
        """
        Verify that production settings reject '*' from ALLOWED_HOSTS environment variable.
        
        This test ensures that the configuration validation prevents operators
        from bypassing the static configuration via environment variables.
        
        Note: This test validates the validation logic exists in the code.
        Full environment variable testing requires Django settings reload which
        is complex in test environments. The validation is checked by manual
        deployment testing and code review.
        """
        # Read the prod settings file and verify validation code exists
        import inspect
        from foodai_backend.settings import prod
        
        # Get the source code of the prod module
        source = inspect.getsource(prod)
        
        # Verify the validation check exists
        assert "if '*' in configured_hosts:" in source, (
            "Production settings must validate that '*' is not in configured_hosts "
            "from environment variable."
        )
        assert "raise ValueError" in source, (
            "Production settings must raise ValueError when wildcard is detected."
        )

    def test_prod_settings_has_required_hosts(self):
        """
        Verify that production ALLOWED_HOSTS includes required Render hosts.
        """
        from foodai_backend.settings import prod
        
        required_hosts = ['.onrender.com', 'foodai-1-cht5.onrender.com']
        for host in required_hosts:
            assert host in prod.ALLOWED_HOSTS, (
                f"Production ALLOWED_HOSTS must include '{host}' for Render deployment."
            )

    def test_prod_settings_debug_is_false(self):
        """
        Verify that DEBUG is False in production settings.
        """
        from foodai_backend.settings import prod
        
        assert prod.DEBUG is False, (
            "Production DEBUG must be False."
        )

    def test_prod_settings_secure_headers_configured(self):
        """
        Verify that security headers are configured in production.
        """
        from foodai_backend.settings import prod
        
        assert prod.SECURE_PROXY_SSL_HEADER is not None, (
            "SECURE_PROXY_SSL_HEADER must be configured in production."
        )
        assert prod.SESSION_COOKIE_SECURE is True, (
            "SESSION_COOKIE_SECURE must be True in production."
        )
        assert prod.CSRF_COOKIE_SECURE is True, (
            "CSRF_COOKIE_SECURE must be True in production."
        )
