"""Avatar item model for the avatar customization shop."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..core.database import Base


class AvatarItem(Base):
    __tablename__ = "avatar_items"

    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String, nullable=False)
    item_type = Column(String, nullable=False)  # outfit, pet, accessory, background, name_color, emote
    slot = Column(String, nullable=True)  # which slot it occupies (head, body, accessory, background, pet)
    rarity = Column(String, default="common")  # common, rare, epic, legendary
    emoji = Column(String, nullable=True)  # display emoji
    color = Column(String, nullable=True)  # CSS color or hex
    cost_gems = Column(Integer, default=0)
    cost_stars = Column(Integer, default=0)
    available_in_shop = Column(Boolean, default=True)
    available_in_chest = Column(Boolean, default=False)
    available_in_spin = Column(Boolean, default=False)
    metadata_json = Column(JSON, nullable=True)  # extra data
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ChildAvatarItem(Base):
    __tablename__ = "child_avatar_items"

    id = Column(Integer, primary_key=True, index=True)
    child_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("avatar_items.id"), nullable=False)
    equipped = Column(Integer, default=0)  # 0=owned but not equipped, 1=equipped
    acquired_at = Column(DateTime(timezone=True), server_default=func.now())

    item = relationship("AvatarItem")
