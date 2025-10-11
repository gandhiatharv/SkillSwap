import os
import django

# Set Django settings FIRST
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skillswap.settings')

# Initialize Django BEFORE importing anything else
django.setup()

# NOW import everything else
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
from skills.middleware import JwtAuthMiddleware
from skills.routing import websocket_urlpatterns

# Get the Django ASGI application
django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JwtAuthMiddleware(
        URLRouter(websocket_urlpatterns)
    ),
})