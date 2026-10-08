export interface PaletteDef {
  id: string;
  name: string;
  colors: string[];
  /** 気分から選ぶテーマパレット */
  mood?: boolean;
}

export const PALETTES: PaletteDef[] = [
  {
    id: 'pastel',
    name: 'パステル',
    colors: ['#F6C5C0', '#F9D9B5', '#FBEAB0', '#D9EBC0', '#BFE3D6', '#BFD8EC', '#CFC8EA', '#E9C8E2', '#F3E3D3', '#E6EEF2', '#FFF6E9', '#D8D2CA'],
  },
  {
    id: 'basic',
    name: 'ベーシック',
    colors: ['#E05A4E', '#F08A3C', '#F2C14E', '#7DB55C', '#3E9A73', '#3F8FC4', '#3C5BA9', '#7A5AA6', '#D2649A', '#8B5E3C', '#FFFFFF', '#2E2A27'],
  },
  {
    id: 'vivid',
    name: 'ビビッド',
    colors: ['#FF3B5C', '#FF7A1A', '#FFC800', '#B7E000', '#00C46A', '#00B8D9', '#1E6CFF', '#6B3CFF', '#D43CFF', '#FF4FA3', '#00D1B2', '#FF5E3A'],
  },
  {
    id: 'earth',
    name: 'アース',
    colors: ['#7A5230', '#A0703F', '#C49A6C', '#DCC3A1', '#8C8A5A', '#5F6B3E', '#9E5A3C', '#C47B57', '#6E6259', '#B9A88F', '#E6D8C3', '#4A3B30'],
  },
  {
    id: 'mono',
    name: 'モノトーン',
    colors: ['#FFFFFF', '#F0EEEB', '#DAD7D2', '#BEBAB4', '#A09C96', '#827E79', '#66625E', '#4B4844', '#33302D', '#1F1D1B', '#E8E4DC', '#C9C3B8'],
  },
  {
    id: 'wa',
    name: '和色',
    colors: [
      '#E9A1A3', // 桜色系（薄紅）
      '#D0576B', // 韓紅花寄り
      '#E3893B', // 柿色
      '#E9C46A', // 山吹（淡）
      '#A7B36A', // 鶯色寄り
      '#5B8A72', // 青竹
      '#6F9EAF', // 浅葱
      '#3D5A80', // 藍
      '#7B6AA6', // 藤紫寄り
      '#A0522D', // 代赭
      '#F3E9D2', // 生成り
      '#2B2B2B', // 墨
    ],
  },
  {
    id: 'nature',
    name: '自然',
    colors: ['#8FB996', '#5E8C61', '#3B6845', '#A3C4BC', '#7FA7C9', '#4F7CAC', '#E8D6A7', '#D9A86C', '#B5651D', '#C9D6A3', '#F1E4C3', '#6B4F3A'],
  },
  { id: 'm-dusk', name: '夕暮れ', mood: true, colors: ['#2E2A4F', '#5B4B8A', '#A05195', '#D45087', '#F48C6E', '#FFB677', '#FFE0A3', '#F7F1E1'] },
  { id: 'm-forest', name: '森林', mood: true, colors: ['#1F3B2D', '#2F5D43', '#4E8061', '#7FA97A', '#B5CDA3', '#E3E8C9', '#8C6A4A', '#5A4430'] },
  { id: 'm-spring', name: '春', mood: true, colors: ['#F7C6CF', '#F9DDE2', '#FFF1C9', '#D6EBC6', '#A9D8B8', '#BFD7EA', '#E8D5F0', '#FFFFFF'] },
  { id: 'm-wa', name: '和風', mood: true, colors: ['#B33E5C', '#E8A0A6', '#D9A441', '#6A8D5D', '#2F4A6D', '#8D6C9F', '#F2E8D5', '#3A3226'] },
  { id: 'm-fantasy', name: '幻想的', mood: true, colors: ['#3A2E6E', '#6A4C9C', '#A88BEB', '#E0C3FC', '#8EC5FC', '#7DE2D1', '#FBC2EB', '#FFF5D6'] },
];

export const DEFAULT_COLOR = '#F6C5C0';
