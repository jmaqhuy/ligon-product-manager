export function broadcastNotification(userIds: string[], data: any) {
  const payload = {
    ...data,
    userIds,
  };
  
  fetch("http://localhost:3000/api/internal/socket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch((e) => {
    console.error("Failed to broadcast notification", e);
  });
}

export function broadcastGlobal(data: any) {
  fetch("http://localhost:3000/api/internal/socket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).catch((e) => {
    console.error("Failed to broadcast global event", e);
  });
}
