// controllers/task.controller.js
import Task from "../models/Task.js";

const allowed    = ["Pendiente", "En Progreso", "Completada"];
const priorities = ["bajo", "medio", "alto"]; // ← NUEVO

export async function list(req, res) {
  const items = await Task.find({ user: req.userId, deleted: false }).sort({ createdAt: -1 });
  res.json({ items });
}

export async function create(req, res) {
  const { title, description = "", status = "Pendiente", clienteId, priority = "medio", dueDate } = req.body; // ← priority + dueDate
  if (!title) return res.status(400).json({ message: "El título es requerido" });

  const task = await Task.create({
    user: req.userId,
    title,
    description,
    status:   allowed.includes(status)       ? status   : "Pendiente",
    priority: priorities.includes(priority)  ? priority : "medio",    // ← NUEVO
    dueDate:  dueDate ? new Date(dueDate) : null,                      // ← NUEVO
    clienteId,
  });
  res.status(201).json({ task });
}

export async function update(req, res) {
  const { id } = req.params;
  const { title, description, status, priority, dueDate } = req.body; // ← priority + dueDate

  if (status   && !allowed.includes(status))
    return res.status(400).json({ message: "Estado inválido" });
  if (priority && !priorities.includes(priority))
    return res.status(400).json({ message: "Prioridad inválida" });

  const patch = { title, description, status };
  if (priority !== undefined) patch.priority = priority;                           // ← NUEVO
  if (dueDate  !== undefined) patch.dueDate  = dueDate ? new Date(dueDate) : null; // ← NUEVO

  const task = await Task.findOneAndUpdate(
    { _id: id, user: req.userId },
    patch,
    { new: true }
  );
  if (!task) return res.status(404).json({ message: "Tarea no encontrada" });
  res.json({ task });
}

export async function remove(req, res) {
  const { id } = req.params;
  const task = await Task.findOneAndUpdate(
    { _id: id, user: req.userId },
    { deleted: true },
    { new: true }
  );
  if (!task) return res.status(404).json({ message: "Tarea no encontrada" });
  res.json({ ok: true });
}

/** ENDPOINT PARA SINCRONIZACIÓN OFFLINE: crea/actualiza por clienteId y devuelve el mapeo */
export async function bulksync(req, res) {
  try {
    const { tasks = [] } = req.body;
    if (!Array.isArray(tasks)) return res.status(400).json({ message: "tasks debe ser array" });

    const mapping = [];

    for (const t of tasks) {
      if (!t || !t.clienteId || !t.title) continue;

      let doc = await Task.findOne({ user: req.userId, clienteId: t.clienteId });

      if (!doc) {
        doc = await Task.create({
          user:        req.userId,
          title:       t.title,
          description: t.description ?? "",
          status:      allowed.includes(t.status)      ? t.status   : "Pendiente",
          priority:    priorities.includes(t.priority) ? t.priority : "medio",     // ← NUEVO
          dueDate:     t.dueDate ? new Date(t.dueDate) : null,                     // ← NUEVO
          clienteId:   t.clienteId,
        });
      } else {
        doc.title       = t.title       ?? doc.title;
        doc.description = t.description ?? doc.description;
        if (t.status   && allowed.includes(t.status))      doc.status   = t.status;
        if (t.priority && priorities.includes(t.priority)) doc.priority = t.priority; // ← NUEVO
        if (t.dueDate  !== undefined) doc.dueDate = t.dueDate ? new Date(t.dueDate) : null; // ← NUEVO
        await doc.save();
      }

      mapping.push({ clienteId: t.clienteId, serverId: String(doc._id) });
    }

    return res.json({ mapping });
  } catch (err) {
    console.error("bulksync error:", err);
    return res.status(500).json({ message: "Error en bulksync" });
  }
}