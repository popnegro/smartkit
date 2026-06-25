document.querySelectorAll('.nav-item').forEach(button => {
  button.addEventListener('click', () => {
    const target = button.getAttribute('data-target');
    
    // Actualizar botones de navegación
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    button.classList.add('active');
    
    // Cambiar visibilidad de secciones
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.getElementById(target).classList.add('active');
    
    // Actualizar título de cabecera
    const titles = { overview: "Dashboard Overview", inventory: "Inventory Management", mediakits: "Media Kits", contacts: "Customer Contacts" };
    document.getElementById('view-title').textContent = titles[target];
  });
});

// --- Conexión con Base de Datos (Simulada con Fetch) ---

// Detectar si estamos en local o producción
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000'
  : 'https://api.tu-dominio-produccion.com';

const API_URL = `${API_BASE_URL}/inventory`;

async function loadInventory() {
  const tbody = document.getElementById('inventory-table-body');
  
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    tbody.innerHTML = data.map(item => `
    <tr>
      <td>${item.name}</td>
      <td>${item.location}</td>
      <td>$${item.price.toLocaleString()}</td>
      <td><span class="status-pill">${item.status}</span></td>
      <td>
        <button class="ghost-button compact" onclick="openEditModal(${JSON.stringify(item).replace(/"/g, '&quot;')})">Edit</button>
        <button class="ghost-button compact danger" onclick="deleteScreen(${item.id})">Delete</button>
      </td>
    </tr>
  `).join('');
  } catch (error) {
    console.error('Error loading inventory:', error);
    tbody.innerHTML = '<tr><td colspan="5">Error loading data from server</td></tr>';
  }
}

// Abrir Modal con datos cargados
window.openEditModal = (item) => {
  document.getElementById('edit-id').value = item.id;
  document.getElementById('edit-name').value = item.name;
  document.getElementById('edit-price').value = item.price;
  document.getElementById('edit-modal').style.display = 'grid';
};

// Funciones para el Modal de Agregar
window.openAddModal = () => {
  document.getElementById('add-form').reset();
  document.getElementById('add-modal').style.display = 'grid';
};

window.closeAddModal = () => {
  document.getElementById('add-modal').style.display = 'none';
};

// Cerrar Modal
window.closeModal = () => {
  document.getElementById('edit-modal').style.display = 'none';
};

// Guardar nueva pantalla (POST)
document.getElementById('add-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const newData = {
    name: document.getElementById('add-name').value,
    location: document.getElementById('add-location').value,
    price: parseFloat(document.getElementById('add-price').value)
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newData)
    });

    if (response.ok) {
      alert('New screen added to inventory!');
      closeAddModal();
      loadInventory(); // Recargar la tabla
    } else {
      throw new Error('Failed to create screen');
    }
  } catch (error) {
    console.error('Error creating screen:', error);
    alert('Error connecting to server.');
  }
});

// Eliminar pantalla (DELETE)
window.deleteScreen = async (id) => {
  if (confirm('Are you sure you want to delete this screen?')) {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadInventory(); // Recargar la tabla
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      console.error('Error deleting screen:', error);
      alert('Error connecting to server.');
    }
  }
};

// Guardar cambios en la Base de Datos
document.getElementById('edit-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const updatedData = {
    id: document.getElementById('edit-id').value,
    name: document.getElementById('edit-name').value,
    price: parseFloat(document.getElementById('edit-price').value)
  };

  console.log('Sending to DB:', updatedData);

  try {
    const response = await fetch(`${API_URL}/${updatedData.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData)
    });

    if (response.ok) {
      alert('Inventory updated successfully!');
      closeModal();
      loadInventory(); // Recargar tabla con datos frescos
    } else {
      throw new Error('Update failed');
    }
  } catch (error) {
    console.error('Error updating:', error);
    alert('Could not update inventory. Is the server running?');
  }
});

// Carga inicial
document.addEventListener('DOMContentLoaded', loadInventory);