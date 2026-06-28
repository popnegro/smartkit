'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // --- STATE ---
  let inventoryData = []; // Caché en memoria para los datos del inventario

  // --- CONFIG ---
  const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://api.tu-dominio-produccion.com';
  const API_URL = `${API_BASE_URL}/inventory`;

  // --- DOM SELECTORS ---
  const viewTitle = document.getElementById('view-title');
  const inventoryTableBody = document.getElementById('inventory-table-body');
  const sidebarNav = document.querySelector('.sidebar-nav');
  const addForm = document.getElementById('add-form');
  const editForm = document.getElementById('edit-form');
  const addModal = document.getElementById('add-modal');
  const editModal = document.getElementById('edit-modal');

  // --- RENDER FUNCTIONS ---
  const renderTable = () => {
    inventoryTableBody.innerHTML = ''; // Limpiar tabla
    if (inventoryData.length === 0) {
      inventoryTableBody.innerHTML = '<tr><td colspan="5">No inventory items found.</td></tr>';
      return;
    }

    inventoryData.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHTML(item.name)}</td>
        <td>${escapeHTML(item.location)}</td>
        <td>$${item.price.toLocaleString()}</td>
        <td><span class="status-pill ${item.status.toLowerCase()}">${escapeHTML(item.status)}</span></td>
        <td>
          <button class="ghost-button compact" data-action="open-edit-modal" data-id="${item.id}">Edit</button>
          <button class="ghost-button compact danger" data-action="delete-screen" data-id="${item.id}">Delete</button>
        </td>
      `;
      inventoryTableBody.appendChild(tr);
    });
  };

  // --- API CALLS ---
  const api = {
    async getInventory() {
      try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        inventoryData = await response.json();
        renderTable();
      } catch (error) {
        console.error('Error loading inventory:', error);
        inventoryTableBody.innerHTML = '<tr><td colspan="5">Error loading data from server.</td></tr>';
      }
    },
    async addScreen(data) {
      return performFetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    async updateScreen(id, data) {
      return performFetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    async deleteScreen(id) {
      return performFetch(`${API_URL}/${id}`, { method: 'DELETE' });
    }
  };

  // --- EVENT HANDLERS ---
  const handleNavClick = (e) => {
    const button = e.target.closest('button[role="tab"]');
    if (!button) return;

    const targetId = button.dataset.target;
    const targetSection = document.getElementById(targetId);

    // Actualizar botones y secciones
    document.querySelectorAll('.sidebar-nav [role="tab"]').forEach(b => b.setAttribute('aria-selected', 'false'));
    button.setAttribute('aria-selected', 'true');

    document.querySelectorAll('.admin-section').forEach(s => s.hidden = true);
    if (targetSection) targetSection.hidden = false;

    // Actualizar título
    const titles = { overview: "Dashboard Overview", inventory: "Inventory Management", mediakits: "Media Kits", contacts: "Customer Contacts" };
    viewTitle.textContent = titles[targetId] || 'Dashboard';
  };

  const handleGeneralClick = (e) => {
    const action = e.target.dataset.action;
    if (!action) return;

    const id = e.target.dataset.id;

    switch (action) {
      case 'open-add-modal':
        addForm.reset();
        addModal.hidden = false;
        addModal.querySelector('input').focus();
        break;
      case 'open-edit-modal':
        const item = inventoryData.find(i => i.id === parseInt(id));
        if (item) {
          editForm.querySelector('#edit-id').value = item.id;
          editForm.querySelector('#edit-name').value = item.name;
          editForm.querySelector('#edit-price').value = item.price;
          editModal.hidden = false;
          editModal.querySelector('input').focus();
        }
        break;
      case 'close-modal':
        e.target.closest('.modal-overlay').hidden = true;
        break;
      case 'delete-screen':
        if (confirm('Are you sure you want to delete this screen?')) {
          api.deleteScreen(id).then(success => {
            if (success) api.getInventory();
          });
        }
        break;
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      location: formData.get('location'),
      price: parseFloat(formData.get('price'))
    };

    const success = await api.addScreen(data);
    if (success) {
      addModal.hidden = true;
      api.getInventory();
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const id = formData.get('id');
    const data = {
      name: formData.get('name'),
      price: parseFloat(formData.get('price'))
    };

    const success = await api.updateScreen(id, data);
    if (success) {
      editModal.hidden = true;
      api.getInventory();
    }
  };

  // --- UTILITY FUNCTIONS ---
  const escapeHTML = str => str.toString().replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);

  async function performFetch(url, options) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        // Intenta parsear el error, si no, usa el texto de estado
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.errors ? errorData.errors.map(e => e.msg).join(', ') : (errorData.message || errorMsg);
        } catch (e) { /* No hacer nada si el cuerpo del error no es JSON */ }
        throw new Error(errorMsg);
      }
      // Para DELETE, puede que no haya cuerpo de respuesta
      if (response.status === 204) return true;
      return await response.json();
    } catch (error) {
      console.error(`Error performing ${options.method || 'GET'} on ${url}:`, error);
      // Reemplazar alert con una notificación toast
      showToast(`Operation failed: ${error.message}`, 'error');
      return false;
    }
  }

  // --- INITIALIZATION ---
  const init = () => {
    sidebarNav.addEventListener('click', handleNavClick);
    document.body.addEventListener('click', handleGeneralClick);
    addForm.addEventListener('submit', handleAddSubmit);
    editForm.addEventListener('submit', handleEditSubmit);

    api.getInventory(); // Carga inicial de datos
  };

  init();

  // Función de utilidad para mostrar notificaciones (debe ser estilizada con CSS)
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('show');
      setTimeout(() => toast.remove(), 3000);
    }, 100);
  }
});