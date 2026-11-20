const icon = (...paths) => paths

export const ICONS = {
  'ff-edit-text': icon(
    'M12 20h9',
    'M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z'
  ),
  'ff-watermark': icon(
    'M14 13V8.5C14 7 15 7 15 5a3 3 0 0 0-6 0c0 2 1 2 1 3.5V13',
    'M20 15.5a2.5 2.5 0 0 0-2.5-2.5h-11A2.5 2.5 0 0 0 4 15.5V17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1z',
    'M5 22h14'
  ),
  'ff-numbers': icon('M4 9h16', 'M4 15h16', 'M10 3 8 21', 'M16 3l-2 18'),
  'ff-merge': icon('m8 6 4-4 4 4', 'M12 2v10.3a4 4 0 0 1-1.172 2.872L4 22', 'm20 22-5-5'),
  'ff-crop': icon('M6 2v14a2 2 0 0 0 2 2h14', 'M18 22V8a2 2 0 0 0-2-2H2'),
}

const TOOLS = [
  ['ff:edit-text', 'Edit text', 'ff-edit-text', 'edit-text'],
  ['ff:watermark', 'Watermark', 'ff-watermark', 'watermark'],
  ['ff:page-numbers', 'Page numbers', 'ff-numbers', 'page-numbers'],
  ['ff:merge', 'Add pages from PDFs', 'ff-merge', 'merge'],
  ['ff:crop', 'Crop pages', 'ff-crop', 'crop'],
]

/** The viewer's own tools cover annotate, shapes, stamps, signatures, forms, redaction and pages; these add the rest. */
export const viewerConfig = {
  features: { redaction: true, measurement: false, 'forms.building': true },
  icons: ICONS,
  commands: TOOLS.map(([id, label, iconName, tool]) => ({
    id,
    label,
    icon: iconName,
    run: ({ appState }) => appState.openTool(tool),
  })),
  layout: (layout) => TOOLS.reduce((chain, [id]) => chain.add(id, { to: 'main', section: 'end' }) ?? chain, layout),
}
