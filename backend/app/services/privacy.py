"""GDPR Privacy Service — data export, account deletion, data summary."""

from typing import Dict, Any, List
from ..core.database import async_session
from ..models.user import User
from ..models.task import TaskInstance, TaskTemplate
from ..models.reward import Reward, RewardRedemption
from ..models.streak import StreakHistory, ChildAchievement
from ..models.cheer import Cheer
from ..models.family_goal import FamilyGoal, FamilyGoalProgress
from ..models.powerup import PowerUpPurchase
from ..models.avatar import ChildAvatarItem
from ..models.notification import Notification
from ..models.sound_settings import SoundSettings
from ..models.daily_ritual import DailyRitual
from ..models.family_message import FamilyMessage
from sqlalchemy import select, delete, update


class PrivacyService:
    """Handles GDPR data export and account deletion."""

    @staticmethod
    async def export_user_data(user_id: int) -> Dict[str, Any]:
        """Export all data associated with a user as a structured JSON object."""
        async with async_session() as db:
            # User profile
            user_result = await db.execute(select(User).where(User.id == user_id))
            user = user_result.scalar_one_or_none()
            if not user:
                raise ValueError("User not found")

            export: Dict[str, Any] = {
                "exported_at": None,  # Will be set by the caller
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "display_name": user.display_name,
                    "role": user.role,
                    "age_tier": user.age_tier,
                    "language": user.language,
                    "created_at": str(user.created_at) if hasattr(user, 'created_at') else None,
                },
                "tasks": [],
                "task_templates": [],
                "rewards": [],
                "redemptions": [],
                "streaks": [],
                "achievements": [],
                "cheers_sent": [],
                "cheers_received": [],
                "family_goals": [],
                "family_goal_progress": [],
                "powerup_purchases": [],
                "avatars": [],
                "notifications": [],
                "sound_settings": None,
                "daily_rituals": [],
                "family_messages_sent": [],
                "family_messages_received": [],
            }

            # Task instances
            tasks_result = await db.execute(
                select(TaskInstance).where(TaskInstance.child_id == user_id)
            )
            for t in tasks_result.scalars().all():
                export["tasks"].append({
                    "id": t.id,
                    "template_id": t.template_id,
                    "status": t.status,
                    "points_earned": t.points_earned,
                    "assigned_date": str(t.assigned_date) if hasattr(t, 'assigned_date') else None,
                    "completed_at": str(t.completed_at) if hasattr(t, 'completed_at') else None,
                })

            # Task templates (if parent)
            if user.role == "parent":
                templates_result = await db.execute(
                    select(TaskTemplate).where(TaskTemplate.family_id == user.family_id)
                )
                for t in templates_result.scalars().all():
                    export["task_templates"].append({
                        "id": t.id,
                        "name": t.name,
                        "task_type": t.task_type,
                        "base_points": t.base_points,
                        "schedule": t.schedule,
                    })

            # Rewards created
            rewards_result = await db.execute(
                select(Reward).where(Reward.family_id == user.family_id)
            )
            for r in rewards_result.scalars().all():
                export["rewards"].append({
                    "id": r.id,
                    "name": r.name,
                    "description": r.description,
                    "cost_stars": r.cost_stars,
                    "cost_gems": r.cost_gems,
                })

            # Reward redemptions
            redemptions_result = await db.execute(
                select(RewardRedemption).where(RewardRedemption.child_id == user_id)
            )
            for rr in redemptions_result.scalars().all():
                export["redemptions"].append({
                    "id": rr.id,
                    "reward_id": rr.reward_id,
                    "status": rr.status,
                    "redeemed_at": str(rr.redeemed_at) if hasattr(rr, 'redeemed_at') else None,
                })

            # Streak history
            streak_result = await db.execute(
                select(StreakHistory).where(StreakHistory.user_id == user_id)
            )
            for s in streak_result.scalars().all():
                export["streaks"].append({
                    "id": s.id,
                    "streak_count": s.streak_count,
                    "date": str(s.date) if hasattr(s, 'date') else None,
                })

            # Achievements
            ach_result = await db.execute(
                select(ChildAchievement).where(ChildAchievement.child_id == user_id)
            )
            for a in ach_result.scalars().all():
                export["achievements"].append({
                    "id": a.id,
                    "achievement_id": a.achievement_id,
                    "unlocked_at": str(a.unlocked_at) if hasattr(a, 'unlocked_at') else None,
                })

            # Cheers sent and received
            cheers_sent = await db.execute(select(Cheer).where(Cheer.from_child_id == user_id))
            for c in cheers_sent.scalars().all():
                export["cheers_sent"].append({
                    "id": c.id,
                    "to_child_id": c.to_child_id,
                    "cheer_type": c.cheer_type,
                })

            cheers_received = await db.execute(select(Cheer).where(Cheer.to_child_id == user_id))
            for c in cheers_received.scalars().all():
                export["cheers_received"].append({
                    "id": c.id,
                    "from_child_id": c.from_child_id,
                    "cheer_type": c.cheer_type,
                })

            # Family goals
            fg_result = await db.execute(
                select(FamilyGoal).where(FamilyGoal.family_id == user.family_id)
            )
            for fg in fg_result.scalars().all():
                export["family_goals"].append({
                    "id": fg.id,
                    "name": fg.name,
                    "target": fg.target,
                    "active": fg.active,
                })

            fgp_result = await db.execute(
                select(FamilyGoalProgress).where(FamilyGoalProgress.child_id == user_id)
            )
            for fgp in fgp_result.scalars().all():
                export["family_goal_progress"].append({
                    "id": fgp.id,
                    "goal_id": fgp.goal_id,
                    "progress": fgp.progress,
                })

            # Power-up purchases
            pp_result = await db.execute(
                select(PowerUpPurchase).where(PowerUpPurchase.child_id == user_id)
            )
            for pp in pp_result.scalars().all():
                export["powerup_purchases"].append({
                    "id": pp.id,
                    "powerup_id": pp.powerup_id,
                    "used": pp.used,
                })

            # Avatars
            av_result = await db.execute(
                select(ChildAvatarItem).where(ChildAvatarItem.child_id == user_id)
            )
            for av in av_result.scalars().all():
                export["avatars"].append({
                    "id": av.id,
                    "avatar_item_id": av.avatar_item_id,
                    "equipped": av.equipped,
                })

            # Notifications
            notif_result = await db.execute(
                select(Notification).where(Notification.user_id == user_id)
            )
            for n in notif_result.scalars().all():
                export["notifications"].append({
                    "id": n.id,
                    "type": n.type,
                    "message": n.message,
                    "read": n.read,
                    "created_at": str(n.created_at) if hasattr(n, 'created_at') else None,
                })

            # Sound settings
            ss_result = await db.execute(
                select(SoundSettings).where(SoundSettings.user_id == user_id)
            )
            ss = ss_result.scalar_one_or_none()
            if ss:
                export["sound_settings"] = {
                    "id": ss.id,
                    "sound_enabled": ss.sound_enabled,
                    "music_enabled": ss.music_enabled,
                }

            # Daily rituals
            dr_result = await db.execute(
                select(DailyRitual).where(DailyRitual.user_id == user_id)
            )
            for dr in dr_result.scalars().all():
                export["daily_rituals"].append({
                    "id": dr.id,
                    "ritual_type": dr.ritual_type,
                    "completed": dr.completed,
                })

            # Family messages sent/received
            fm_sent = await db.execute(
                select(FamilyMessage).where(FamilyMessage.from_user_id == user_id)
            )
            for fm in fm_sent.scalars().all():
                export["family_messages_sent"].append({
                    "id": fm.id,
                    "message": fm.message,
                    "created_at": str(fm.created_at) if hasattr(fm, 'created_at') else None,
                })

            fm_received = await db.execute(
                select(FamilyMessage).where(FamilyMessage.to_user_id == user_id)
            )
            for fm in fm_received.scalars().all():
                export["family_messages_received"].append({
                    "id": fm.id,
                    "message": fm.message,
                    "from_user_id": fm.from_user_id,
                    "created_at": str(fm.created_at) if hasattr(fm, 'created_at') else None,
                })

            return export

    @staticmethod
    async def delete_user_account(user_id: int) -> bool:
        """Soft-delete a user account (GDPR right to erasure).
        
        Anonymizes the user: clears display_name, sets deleted flag.
        Does NOT hard-delete family-shared resources (tasks, rewards).
        """
        async with async_session() as db:
            user_result = await db.execute(select(User).where(User.id == user_id))
            user = user_result.scalar_one_or_none()
            if not user:
                return False

            # Delete user-owned data
            await db.execute(delete(StreakHistory).where(StreakHistory.user_id == user_id))
            await db.execute(delete(ChildAchievement).where(ChildAchievement.child_id == user_id))
            await db.execute(delete(PowerUpPurchase).where(PowerUpPurchase.child_id == user_id))
            await db.execute(delete(ChildAvatarItem).where(ChildAvatarItem.child_id == user_id))
            await db.execute(delete(Notification).where(Notification.user_id == user_id))
            await db.execute(delete(SoundSettings).where(SoundSettings.user_id == user_id))
            await db.execute(delete(DailyRitual).where(DailyRitual.user_id == user_id))

            # Anonymize cheers
            await db.execute(
                update(Cheer).where(Cheer.from_child_id == user_id).values(from_child_id=None)
            )
            await db.execute(
                update(Cheer).where(Cheer.to_child_id == user_id).values(to_child_id=None)
            )

            # Anonymize family messages
            await db.execute(
                update(FamilyMessage).where(FamilyMessage.from_user_id == user_id).values(
                    from_user_id=None
                )
            )
            await db.execute(
                update(FamilyMessage).where(FamilyMessage.to_user_id == user_id).values(
                    to_user_id=None
                )
            )

            # Anonymize task instances
            await db.execute(
                update(TaskInstance).where(TaskInstance.child_id == user_id).values(
                    child_id=None
                )
            )

            # Anonymize reward redemptions
            await db.execute(
                update(RewardRedemption).where(RewardRedemption.child_id == user_id).values(
                    child_id=None
                )
            )

            # Anonymize user record
            await db.execute(
                update(User).where(User.id == user_id).values(
                    display_name="Deleted User",
                    hashed_password="",
                    is_active=False,
                )
            )

            await db.commit()
            return True

    @staticmethod
    async def get_data_summary() -> Dict[str, str]:
        """Return a human-readable summary of what data we store."""
        return {
            "profile": "Username, display name, role, age tier, language preference",
            "tasks": "Task templates and task instances with completion status and points earned",
            "rewards": "Reward items and redemption history",
            "streaks": "Daily streak history",
            "achievements": "Badges and achievements earned",
            "cheers": "Encouragement messages sent and received",
            "family_goals": "Family goals and individual progress",
            "powerups": "Power-up purchases and usage",
            "avatars": "Avatar customization items",
            "notifications": "In-app notification history",
            "settings": "Sound preferences, theme, language, accessibility options",
            "rituals": "Daily ritual preferences",
            "messages": "Family message board messages",
            "retention": "Data is retained while your account is active. Deleted accounts are anonymized within 30 days.",
            "sharing": "We do not sell, rent, or share personal data with third parties.",
            "cookies": "We use only essential cookies for authentication and language preferences. No tracking or advertising cookies.",
        }
