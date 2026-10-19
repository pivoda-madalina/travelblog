"""Cover photos leave storage with their trip, or when replaced (US-02)."""

from django.db.models.signals import post_delete, pre_save
from django.dispatch import receiver

from core.files import delete_file_on_commit
from trips.models import Trip


@receiver(pre_save, sender=Trip)
def delete_replaced_cover_photo(sender, instance: Trip, **kwargs):
    if instance.pk is None:
        return
    old = Trip.objects.filter(pk=instance.pk).first()
    if old is not None and old.cover_photo and old.cover_photo.name != instance.cover_photo.name:
        delete_file_on_commit(old.cover_photo)


@receiver(post_delete, sender=Trip)
def delete_cover_photo(sender, instance: Trip, **kwargs):
    delete_file_on_commit(instance.cover_photo)
