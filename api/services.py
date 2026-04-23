from django.contrib.auth.models import User
from django.utils import timezone

from authentication.models import UserProfile


def sync_profile_from_auth_user(auth_user):
    profile = UserProfile.objects.filter(email=auth_user.email).first()

    if profile is None:
        return UserProfile.objects.create(
            nombre_usuario=auth_user.username,
            email=auth_user.email,
            password=auth_user.password,
            fecha_registro=timezone.now(),
        )

    profile.nombre_usuario = auth_user.username
    profile.password = auth_user.password
    if not profile.fecha_registro:
        profile.fecha_registro = timezone.now()
    profile.save()
    return profile


def get_or_sync_profile_for_auth_user(auth_user):
    profile = UserProfile.objects.filter(email=auth_user.email).first()
    if profile is not None:
        return profile

    return sync_profile_from_auth_user(auth_user)


def sync_auth_user_from_profile(profile, raw_password=None):
    auth_user = User.objects.filter(username=profile.nombre_usuario).first()
    if auth_user is None:
        auth_user = User.objects.filter(email=profile.email).first()

    if auth_user is None:
        if raw_password is None:
            return None

        auth_user = User.objects.create_user(
            username=profile.nombre_usuario,
            email=profile.email,
            password=raw_password,
        )
    else:
        auth_user.username = profile.nombre_usuario
        auth_user.email = profile.email
        if raw_password:
            auth_user.set_password(raw_password)
        auth_user.save()

    UserProfile.objects.filter(pk=profile.pk).update(password=auth_user.password)
    profile.password = auth_user.password

    return auth_user
