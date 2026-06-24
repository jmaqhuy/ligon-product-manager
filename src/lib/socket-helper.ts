export function broadcastNotification(userIds: string[], data: any) {
  const payload = {
    ...data,
    userIds,
  };
  
  // Post to internal socket endpoint instead of relying on global.io
  fetch("http://localhost:3000/api/internal/socket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch((e) => {
    console.error("Failed to broadcast notification", e);
  });
}
