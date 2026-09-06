const bgMusic = document.getElementById("bgMusic");

bgMusic.volume = 0.3;

bgMusic.play().catch(() => {
  console.log("O navegador bloqueou o autoplay.");
});
