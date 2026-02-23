import { Router } from "express";
import { auth } from "../middleware/auth.js"
import { list, create, update, remove, bulksync } from "../controllers/task.controller.js" //bulksync

const router = Router();
router.use(auth);
router.get('/', list);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);
router.post('/bulksync', bulksync); //Sincronizacion masiva de tareas

export default router;