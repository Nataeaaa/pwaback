import Task from "../models/Task.js";



const allowed = ["Pendiente", "En progreso", "Completada"];

export async function list(req, res) {
    const items = await Task.find({user: req.userId,
        deleted: false}).sort({createdAt: -1});
        res.json(items);
}

export async function create(req, res){

    const{title, description="", status="Pendiente", clienteId}=req.body;
    if(!title) return res.status(400).json({message:'El título es obligatorio'});

    const task = await Task.create({
    user: req.userId,
    title,
    description,
    status: allowed.includes(status) ? status:
    'Pendiente',
    clienteId 
});
return res.status(201).json(task);
}

export async function update(req, res) {
    const {id} = req.params;
    const {title, description, status} = req.body;

    if(status && !allowed.includes(status))
        return res.status(400).json({message: 'Estado no válido'});

    const task = await Task.findOneAndUpdate(
        {_id: id, user: req.userId},
        {title, description, status},
        {new: true}
        );
        if (!task) return res.status(404).json({message:'Tarea no encontrada'});
        res.json({task});
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