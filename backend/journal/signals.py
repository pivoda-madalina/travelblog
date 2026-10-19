"""Photo files leave storage with their photo, including when a trip or entry delete cascades
to it (BR-11)."""

from django.db.models.signals import post_delete
from django.dispatch import receiver

from core.files import delete_file_on_commit
from journal.models import Photo


@receiver(post_delete, sender=Photo)
def delete_photo_files(sender, instance: Photo, **kwargs):
    delete_file_on_commit(instance.image)
    delete_file_on_commit(instance.thumbnail)
