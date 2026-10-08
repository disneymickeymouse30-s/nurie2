// ===== ドメイン型（仕様 §28 に対応。将来 Supabase のテーブルにそのまま移せる形） =====

export type CategoryId =
  | 'animal'
  | 'flower'
  | 'landscape'
  | 'building'
  | 'food'
  | 'fantasy'
  | 'japanese'
  | 'geometric'
  | 'mandala'
  | 'healing';

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  createdAt: number;
}

/** 塗り絵（線画）。サンプルは SVG 文字列、写真から作ったものは PNG Blob を持つ */
export interface ColoringPage {
  id: string;
  title: string;
  category: CategoryId;
  difficulty: Difficulty;
  /** 目安の所要時間（分） */
  minutes: number;
  /** 人気度 0-100 */
  popularity: number;
  source: 'sample' | 'photo' | 'ai';
  createdAt: number;
  /** sample の場合の線画 SVG */
  svg?: string;
  isNew?: boolean;
}

export type ArtworkStatus = 'in_progress' | 'completed';

/** ユーザーの作品（塗り途中も含む） */
export interface Artwork {
  id: string;
  userId: string;
  coloringPageId: string;
  title: string;
  status: ArtworkStatus;
  favorite: boolean;
  /** 写真から作った場合 true（マイギャラリー「自分で作った塗り絵」） */
  isCustom: boolean;
  width: number;
  height: number;
  /** 線画（透過 PNG ではなく白背景の黒線 PNG） */
  lineArt: Blob;
  /** 着色レイヤー（透過 PNG） */
  colorLayer?: Blob;
  /** 写真から作った場合の元画像（EXIF 除去・縮小済み JPEG） */
  originalImage?: Blob;
  /** 一覧用サムネイル（JPEG） */
  thumbnail?: Blob;
  usedColors: string[];
  /** 制作時間（ミリ秒、エディターを開いていた時間の累計） */
  elapsedMs: number;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface ColorPalette {
  id: string;
  userId: string;
  name: string;
  colors: string[];
}

export interface Favorite {
  id: string;
  userId: string;
  coloringPageId: string;
}

export type Tool = 'fill' | 'brush' | 'eraser' | 'move';

export type BrushSize = 's' | 'm' | 'l';

// ===== 写真 → 塗り絵 変換 =====
export type ConvertStyle = 'easy' | 'standard' | 'detailed' | 'art' | 'mandala';
export type BackgroundMode = 'keep' | 'simplify' | 'remove';
export type SubjectKind = 'auto' | 'person' | 'pet' | 'building' | 'flower' | 'landscape';

export interface ConvertOptions {
  style: ConvertStyle;
  /** 線の細かさ 0(粗い)〜100(細かい) */
  detail: number;
  /** 線の太さ 1〜5 */
  thickness: number;
  background: BackgroundMode;
  subject: SubjectKind;
  /** 塗り絵密度 0(低)〜100(高) */
  density: number;
}
