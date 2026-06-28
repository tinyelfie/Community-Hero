import api from '../api.js';
import { navigate } from '../app.js';
import toast from '../components/toast.js';

export function renderDemo(container) {
  container.innerHTML = `
    <div class="h-screen w-full flex flex-col items-center justify-center bg-surface pt-16">
      <div class="text-center max-w-md p-8">
        <h1 class="text-3xl font-display-xl text-on-surface mb-4">Demo Mode</h1>
        <p class="text-on-surface-variant mb-8">This will reset the entire database and seed it with a realistic set of 25 issues, 3 users, and organic interaction data.</p>
        <button id="seed-demo-btn" class="btn bg-primary text-white font-bold py-3 px-8 rounded-full shadow-md hover:shadow-lg transition-all w-full flex items-center justify-center gap-2">
          🌱 Seed Demo Data
        </button>
      </div>
    </div>
  `;

  document.getElementById('seed-demo-btn').addEventListener('click', async (e) => {
    const btn = e.target;
    btn.disabled = true;
    btn.innerHTML = '✨ Seeding Database...';
    try {
      await api.admin.seedDemo();
      toast.success('Demo data seeded successfully! 🚀');
      setTimeout(() => {
        navigate('home');
        window.location.reload();
      }, 1500);
    } catch (err) {
      toast.error('Failed to seed demo data.');
      btn.disabled = false;
      btn.innerHTML = '🌱 Seed Demo Data';
    }
  });
}
