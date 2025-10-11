from django.core.management.base import BaseCommand
from skills.models import Skill
import json
import os

class Command(BaseCommand):
    help = 'Seed skills from skills.json'

    def handle(self, *args, **kwargs):
        file_path = os.path.join(os.path.dirname(__file__), '..', '..', 'skills.json')
        file_path = os.path.abspath(file_path)

        with open(file_path, 'r') as f:
            skills_data = json.load(f)

        count = 0
        for skill in skills_data:
            name = skill.get('name')
            category = skill.get('category')
            subcategory = skill.get('subcategory')

            if name:
                obj, created = Skill.objects.get_or_create(
                    name=name,
                    defaults={
                        'category': category,
                        'subcategory': subcategory
                    }
                )
                if created:
                    count += 1


        self.stdout.write(self.style.SUCCESS(f'Successfully seeded {count} skills.'))
