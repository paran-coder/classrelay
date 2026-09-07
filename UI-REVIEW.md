# ClassRelay v2.6.1 UI Review

## Template manager
The Mail / Delivery Log screen now uses a master-editor pattern:
- left: saved templates
- right: selected template editor
- top action: `+ 템플릿 추가`
- editor actions: preview / duplicate / delete / set default / save
- course assignment appears inside the selected template editor

The design remains consistent with the ClassRelay admin density: compact 12–18px type hierarchy, neutral surfaces, no decorative shadows, explicit focus states and responsive collapse below tablet width.

## CS history
Snapshot links are exposed only when a log actually contains a saved email snapshot. Opening a snapshot shows recipient, course, request number, template, rendered subject/body and recording URL.

## Responsive behavior
- Desktop: template list + editor side by side.
- Narrow screen: template list becomes horizontal scroll and editor stacks below.
- Email log moves below the template card when the outer two-column layout collapses.

## Recovery UI
A startup error now displays an explicit recovery card with a retry action instead of an empty workspace.
