from django.db import transaction
from django.db.models.fields.files import FieldFile


def delete_file_on_commit(file: FieldFile | None) -> None:
    """Removes a stored file once the transaction that dropped it commits, so a rolled-back
    delete or edit keeps its file."""
    if not file:
        return
    name, storage = file.name, file.storage
    transaction.on_commit(lambda: storage.delete(name))
