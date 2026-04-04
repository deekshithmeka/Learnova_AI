// Load Spline 3D Animation
async function initSpline() {
  try {
    const canvas = document.getElementById('spline-canvas');
    
    // Dynamically import Spline runtime
    const { Application } = await import('https://unpkg.com/@splinetool/runtime@1.12.51/build/runtime.js');
    
    const spline = new Application(canvas);
    
    // Load the Spline scene
    await spline.load('https://prod.spline.design/f6urL71l3rlbQAHC/scene.splinecode');
    
    console.log('✅ Spline 3D animation loaded successfully');
  } catch (err) {
    console.error('❌ Spline failed to load:', err);
    console.log('Using fallback animated background...');
    initFallbackAnimation();
  }
}

// Fallback animated gradient if Spline fails
function initFallbackAnimation() {
  const canvas = document.getElementById('spline-canvas');
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  resize();
  window.addEventListener('resize', resize);

  let animationTime = 0;

  function animate() {
    animationTime += 0.005;
    
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    
    const hue1 = (animationTime * 30) % 360;
    const hue2 = ((animationTime * 30) + 120) % 360;
    const hue3 = ((animationTime * 30) + 240) % 360;
    
    gradient.addColorStop(0, `hsl(${hue1}, 100%, 30%)`);
    gradient.addColorStop(0.5, `hsl(${hue2}, 100%, 20%)`);
    gradient.addColorStop(1, `hsl(${hue3}, 100%, 25%)`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    requestAnimationFrame(animate);
  }

  animate();
  console.log('✅ Fallback animation initialized');
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSpline);
} else {
  initSpline();
}
