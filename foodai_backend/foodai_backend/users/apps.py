from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'foodai_backend.users'

    def ready(self):
        import foodai_backend.users.models  # noqa: F401
