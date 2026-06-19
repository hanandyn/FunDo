import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import * as sounds from '../../lib/sounds';
import type { AvatarShopItem, OwnedAvatarItem } from '../../lib/types';

type TabType = 'inventory' | 'shop';

const TYPE_ICONS: Record<string, string> = {
  outfit: '👕',
  pet: '🐾',
  accessory: '💍',
  background: '🖼️',
  name_color: '🎨',
  emote: '😀',
};

const RARITY_COLORS: Record<string, string> = {
  common: 'border-gray-400 bg-gray-100',
  rare: 'border-blue-400 bg-blue-50',
  epic: 'border-purple-400 bg-purple-50',
  legendary: 'border-yellow-400 bg-yellow-50',
};

const RARITY_BADGE: Record<string, string> = {
  common: '⚪ Common',
  rare: '🔵 Rare',
  epic: '🟣 Epic',
  legendary: '🟡 Legendary',
};

export function AvatarCustomizer() {
  const { user } = useAuth();
  const [shopItems, setShopItems] = useState<AvatarShopItem[]>([]);
  const [ownedItems, setOwnedItems] = useState<OwnedAvatarItem[]>([]);
  const [tab, setTab] = useState<TabType>('inventory');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [category, setCategory] = useState<string>('all');

  const loadData = useCallback(async () => {
    try {
      const [shop, items] = await Promise.all([
        api.getAvatarShop(),
        api.getOwnedAvatarItems(),
      ]);
      setShopItems(shop as unknown as AvatarShopItem[]);
      setOwnedItems(items as unknown as OwnedAvatarItem[]);
    } catch { /* ignore */ }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData(); }, [loadData]);

  const showMessage = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleBuy = async (item: AvatarShopItem) => {
    try {
      const result = await api.buyAvatarItem(item.id) as unknown as { message: string; gems_remaining: number; stars_remaining: number };
      sounds.playPointsEarned();
      showMessage(result.message || `Bought ${item.item_name}!`);
      loadData();
    } catch (err) {
      showMessage(err instanceof Error ? err.message : 'Failed to buy', 'error');
    }
  };

  const handleEquip = async (ownedItem: OwnedAvatarItem) => {
    try {
      await api.equipAvatarItem(ownedItem.id);
      sounds.playButtonClick();
      showMessage(`${ownedItem.item_name} ${ownedItem.equipped ? 'unequipped' : 'equipped'}!`);
      loadData();
    } catch (err) {
      showMessage(err instanceof Error ? err.message : 'Failed to equip', 'error');
    }
  };

  // Group owned items by slot for avatar preview
  const equipped = ownedItems.filter(i => i.equipped);
  const equippedSlot: Record<string, OwnedAvatarItem> = {};
  for (const item of equipped) {
    equippedSlot[item.slot] = item;
  }

  // Filter by category
  const filteredShop = category === 'all'
    ? shopItems
    : shopItems.filter(i => i.item_type === category);

  const filteredOwned = category === 'all'
    ? ownedItems
    : ownedItems.filter(i => i.item_type === category);

  // Category list from shop
  const categories = ['all', ...new Set(shopItems.map(i => i.item_type))];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-pink-900">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-black/20 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🎨</span> Avatar Studio
          </h1>
          <div className="flex items-center gap-3 text-sm text-white/80">
            <span>💎 {user?.gems}</span>
            <span>⭐ {user?.stars}</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Avatar Preview */}
        <div className="relative bg-white/10 backdrop-blur rounded-2xl p-8 mb-6 flex flex-col items-center">
          {/* Background layer */}
          {equippedSlot.background && (
            <div className="absolute inset-0 rounded-2xl overflow-hidden">
              <div className="text-8xl absolute inset-0 flex items-center justify-center opacity-30">
                {equippedSlot.background.emoji}
              </div>
            </div>
          )}

          {/* Avatar display */}
          <motion.div
            className="relative"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            {/* Base character */}
            <div className="text-8xl relative">
              {/* Default base icon or user avatar */}
              <span>🧒</span>

              {/* Head accessory */}
              {equippedSlot.head && (
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-4xl">
                  {equippedSlot.head.emoji}
                </span>
              )}

              {/* Body outfit indicator */}
              {equippedSlot.body && (
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs bg-black/50 text-white px-2 py-0.5 rounded-full whitespace-nowrap">
                  {equippedSlot.body.item_name}
                </span>
              )}

              {/* Accessory */}
              {equippedSlot.accessory && (
                <span className="absolute top-2 -right-4 text-3xl">
                  {equippedSlot.accessory.emoji}
                </span>
              )}

              {/* Pet */}
              {equippedSlot.pet && (
                <span className="absolute -bottom-4 -right-4 text-4xl">
                  {equippedSlot.pet.emoji}
                </span>
              )}
            </div>
          </motion.div>

          {/* Name with color */}
          <p
            className="mt-4 text-lg font-bold"
            style={{
              color: equippedSlot.name_color?.color === 'rainbow'
                ? undefined
                : equippedSlot.name_color?.color || '#fff',
              ...(equippedSlot.name_color?.color === 'rainbow' ? {
                background: 'linear-gradient(90deg, #ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #8800ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              } : {}),
            }}
          >
            {user?.display_name}
          </p>

          <p className="text-sm text-white/60 mt-1">Level {user?.level} • {equipped.length} items equipped</p>
        </div>

        {/* Message */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-4 px-4 py-3 rounded-xl text-center text-sm font-medium ${
                messageType === 'success'
                  ? 'bg-green-500/20 text-green-200 border border-green-500/30'
                  : 'bg-red-500/20 text-red-200 border border-red-500/30'
              }`}
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {[
            { key: 'inventory' as const, label: '🎒 My Items' },
            { key: 'shop' as const, label: '🛍️ Shop' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                tab === key
                  ? 'bg-white/20 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                category === cat
                  ? 'bg-white/30 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {cat === 'all' ? 'All' : `${TYPE_ICONS[cat] || '📦'} ${cat.replace('_', ' ')}`}
            </button>
          ))}
        </div>

        {/* Inventory */}
        {tab === 'inventory' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredOwned.map(item => (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleEquip(item)}
                className={`relative rounded-xl p-3 text-left transition-all ${
                  item.equipped
                    ? 'bg-white/20 ring-2 ring-yellow-400'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{item.emoji || '📦'}</span>
                  {item.equipped && (
                    <span className="absolute top-1 right-1 text-xs">✅</span>
                  )}
                </div>
                <p className="text-white font-medium text-sm truncate">{item.item_name}</p>
                <p className="text-white/50 text-xs">{item.slot}</p>
                <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                  item.rarity === 'common' ? 'bg-gray-500/30 text-gray-300' :
                  item.rarity === 'rare' ? 'bg-blue-500/30 text-blue-300' :
                  item.rarity === 'epic' ? 'bg-purple-500/30 text-purple-300' :
                  'bg-yellow-500/30 text-yellow-300'
                }`}>
                  {item.rarity}
                </span>
              </motion.button>
            ))}
            {filteredOwned.length === 0 && (
              <div className="col-span-full text-center py-12 text-white/50">
                <div className="text-5xl mb-3">🎒</div>
                <p>No items yet. Visit the shop!</p>
              </div>
            )}
          </div>
        )}

        {/* Shop */}
        {tab === 'shop' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredShop.map(item => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`relative rounded-xl p-3 border-2 ${RARITY_COLORS[item.rarity] || 'border-white/10 bg-white/5'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-3xl">{item.emoji || '📦'}</span>
                </div>
                <p className="text-white font-medium text-sm truncate">{item.item_name}</p>
                <p className="text-white/50 text-xs mb-2">{RARITY_BADGE[item.rarity] || item.rarity}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/70">
                    {item.cost_gems > 0 && `💎${item.cost_gems}`}
                    {item.cost_stars > 0 && ` ⭐${item.cost_stars}`}
                  </span>
                  {item.owned ? (
                    <span className="text-xs text-green-400 font-medium">Owned ✓</span>
                  ) : (
                    <button
                      onClick={() => handleBuy(item)}
                      disabled={
                        (item.cost_gems > (user?.gems || 0)) ||
                        (item.cost_stars > (user?.stars || 0))
                      }
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-white/20 hover:bg-white/30 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      Buy
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
