---
description: Push local changes to the remote GitHub repository
---

## Pasos

1. **Añadir todos los cambios**
   ```bash
   git add .
   ```

2. **Crear un commit** (se pedirá mensaje al ejecutar)
   ```bash
   git commit -m "Actualización automática"
   ```

3. **Push al remoto**
   ```bash
   git push
   ```

// turbo

Puedes ejecutar este workflow con el comando:
```
run workflow push_to_github
```
