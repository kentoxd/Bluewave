window.addEventListener("scroll", function() {
  if (window.scrollY > 50) {
    document.querySelector(".navbar").classList.add("nav-small");
    document.querySelector(".activ").classList.add("active");
  } else {
    document.querySelector(".navbar").classList.remove("nav-small");
    document.querySelector(".activ").classList.remove("active");
  }
});