import json
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skillswap.settings')
django.setup()

from skills.models import Skill

# Load JSON
with open('skills/skills.json', 'r') as f:
    skills_data = json.load(f)

# Clear existing (optional)
# Skill.objects.all().delete()

# Load skills
for item in skills_data:
    Skill.objects.get_or_create(
        name=item['name'],
        defaults={
            'category': item.get('category', ''),
            'subcategory': item.get('subcategory', '')
        }
    )
    print(f"✓ {item['name']}")

print(f"\nTotal skills in database: {Skill.objects.count()}")