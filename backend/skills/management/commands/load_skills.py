# backend/skills/management/commands/load_skills.py
import json
from django.core.management.base import BaseCommand
from skills.models import Skill
from pathlib import Path

class Command(BaseCommand):
    help = 'Load skills from JSON file'

    def handle(self, *args, **kwargs):
        # Adjust path to your skills.json location
        json_path = Path(__file__).resolve().parent.parent.parent / 'data' / 'skills.json'
        
        # Or try this path:
        # json_path = Path(__file__).resolve().parent.parent.parent / 'skills.json'
        
        if not json_path.exists():
            self.stdout.write(self.style.ERROR(f'File not found: {json_path}'))
            return
        
        with open(json_path, 'r') as f:
            skills_data = json.load(f)
        
        created_count = 0
        updated_count = 0
        
        for skill_data in skills_data:
            skill, created = Skill.objects.update_or_create(
                name=skill_data['name'],
                defaults={
                    'category': skill_data.get('category', ''),
                    'subcategory': skill_data.get('subcategory', '')
                }
            )
            
            if created:
                created_count += 1
            else:
                updated_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully loaded {created_count} new skills and updated {updated_count} existing skills'
            )
        )