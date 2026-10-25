import { createScene, checkpoint, restore } from './scene.mjs';
export const KEY = 'classic-atlas.windowlife.request-scene.v1';
export function readSave(storage) {
  try {
    const raw = storage.getItem(KEY);
    if (raw === null) return { game: createScene(), protection: null };
    if (raw.length > 500000) return { game: createScene(), protection: 'invalid' };
    const game = restore(JSON.parse(raw));
    return game ? { game, protection: null } : { game: createScene(), protection: 'invalid' };
  } catch (error) { return { game: createScene(), protection: error instanceof SyntaxError ? 'invalid' : 'unavailable' }; }
}
export function writeSave(storage, game, protection) {
  if (protection) return false;
  try { storage.setItem(KEY, JSON.stringify(checkpoint(game))); return true; } catch { return false; }
}
export function warning(protection) {
  return protection === 'invalid' ? '这段下午的存档无法识别，原字节已保留。本次可临时游玩，刷新会丢失新安排。原三日存档不受影响。' :
    protection ? '无法读取这段下午的存档，已停止写入。本次可临时游玩；原三日存档不受影响。' :
      '这次没有保存成功。仍可继续，刷新可能丢失新安排；之后会再次尝试保存。';
}
