// Keep capture alerts and direct transaction feedback; ambient events stay in the world/HUD.
const visible=new Set(['capture','panelraid','districtpanelraid','cash','shopPaid','securitypaid','emote']);
export const showEventCaption=kind=>visible.has(kind);
