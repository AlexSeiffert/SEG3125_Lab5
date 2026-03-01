// Sidebar sticky/follow logic
(function sidebarFollow() {
  // Handles sidebar positioning on scroll and resize
  const LG_MIN = 992;
  const margin = 16;
  const sidebar = document.getElementById("sidebar");
  const col = document.getElementById("sidebarCol");
  const spacer = document.getElementById("sidebarSpacer");
  const nav = document.querySelector(".navbar.sticky-top");
  if (!sidebar || !col || !spacer) return;
  function reset() {
    sidebar.style.position = "";
    sidebar.style.left = "";
    sidebar.style.width = "";
    sidebar.style.bottom = "";
    sidebar.style.top = "";
    sidebar.style.zIndex = "";
    spacer.style.height = "0px";
  }
  function place() {
    if (window.innerWidth < LG_MIN) {
      reset();
      return;
    }
    const navH = nav ? nav.getBoundingClientRect().height : 0;
    const sidebarH = sidebar.offsetHeight;
    spacer.style.height = sidebarH + "px";
    const colRect = col.getBoundingClientRect();
    const colTop = colRect.top + window.scrollY;
    const colLeft = colRect.left + window.scrollX;
    const colWidth = colRect.width;
    const colBottom = colTop + col.offsetHeight;
    const viewportTop = window.scrollY + navH + margin;
    if (viewportTop < colTop) {
      reset();
      return;
    }
    const desiredTop = window.scrollY + window.innerHeight - margin - sidebarH;
    const maxTop = colBottom - margin - sidebarH;
    if (desiredTop >= maxTop) {
      sidebar.style.position = "absolute";
      sidebar.style.left = "0";
      sidebar.style.width = "100%";
      sidebar.style.top = maxTop - colTop + "px";
      sidebar.style.bottom = "";
      sidebar.style.zIndex = "";
      return;
    }
    sidebar.style.position = "fixed";
    sidebar.style.left = colLeft + "px";
    sidebar.style.width = colWidth + "px";
    sidebar.style.bottom = margin + "px";
    sidebar.style.top = "";
    sidebar.style.zIndex = "1010";
  }
  window.addEventListener("scroll", place, { passive: true });
  window.addEventListener("resize", place);
  window.addEventListener("load", place);
  place();
})();
