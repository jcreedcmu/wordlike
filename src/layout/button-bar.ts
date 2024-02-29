import { DEBUG } from "../util/debug";

export const buttonBarButtons = [
  'bugReport',
  'settings',
] as const;

export type ButtonBarButton = (typeof buttonBarButtons)[number];

export const conditionalButtonBarButtons: ButtonBarButton[] = DEBUG.bugReportButton ? ['bugReport'] : [];

export const activeButtonBarButtons: ButtonBarButton[] = [
  ...conditionalButtonBarButtons,
  'settings'
];
