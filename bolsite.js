(function () {
    "use strict";

    var storageKey = "bol-color-theme";
    var allowedThemes = ["midnight", "olive"];
    var themeButtons = Array.prototype.slice.call(document.querySelectorAll("[data-theme-choice]"));
    var theme = "midnight";

    try {
        var savedTheme = window.localStorage.getItem(storageKey);
        if (allowedThemes.indexOf(savedTheme) !== -1) theme = savedTheme;
    } catch (error) {
        // The selected theme still works for this visit if browser storage is unavailable.
    }

    function chooseTheme(value) {
        if (allowedThemes.indexOf(value) === -1) return;
        document.body.setAttribute("data-theme", value);
        var themeMeta = document.querySelector('meta[name="theme-color"]');
        if (themeMeta) {
            var themeColor = window.getComputedStyle(document.body).getPropertyValue("--theme-color").trim();
            if (themeColor) themeMeta.setAttribute("content", themeColor);
        }
        themeButtons.forEach(function (button) {
            button.setAttribute("aria-pressed", button.getAttribute("data-theme-choice") === value ? "true" : "false");
        });
        try {
            window.localStorage.setItem(storageKey, value);
        } catch (error) {
            // Keep the current theme in memory when browser storage is unavailable.
        }
    }

    themeButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            chooseTheme(button.getAttribute("data-theme-choice"));
        });
    });
    chooseTheme(theme);

    // Shared public navigation, identical on all pages.
    var nav = document.querySelector(".site-nav");
    if (nav && !window.location.pathname.startsWith("/admin/")) {
        nav.innerHTML = '<a href="index.html">Home</a><a href="about.html">About</a>' +
        '<details class="nav-more"><summary>Messages</summary><div class="nav-more-menu"><a href="sermons.html">Sermons</a><a href="bible-study.html">Bible Study</a><a href="daily-quotes.html">Daily Verses</a></div></details>' +
        '<details class="nav-more"><summary>Youth</summary><div class="nav-more-menu"><a href="hour-of-power.html">Hour of Power</a><a href="chess.html">Champions League Chess</a><a href="youth-portfolio.html">Our Youth Projects Portfolio</a></div></details>' +
        '<details class="nav-more"><summary>Community</summary><div class="nav-more-menu"><a href="calendar.html">Calendar</a><a href="gallery.html">Memory Lane</a><a href="archive.html">Archive</a></div></details>' +
        '<a href="beacon-of-hope.html">Beacon of Hope Charity</a><a href="contact.html">Contact</a>';
        nav.querySelectorAll("details").forEach(function(menu) {
            menu.addEventListener("toggle", function() {
                if(menu.open) nav.querySelectorAll("details[open]").forEach(function(other){if(other!==menu) other.open=false;});
            });
        });
        document.addEventListener("click", function(e){if(!nav.contains(e.target))nav.querySelectorAll("details[open]").forEach(function(menu){menu.open=false;});});
        nav.addEventListener("keydown",function(e){if(e.key==="Escape"){var menu=nav.querySelector("details[open]");if(menu){menu.open=false;menu.querySelector("summary").focus();}}});
    }

    var currentPage = window.location.pathname.split("/").pop() || "index.html";
    var primaryLinks = Array.prototype.slice.call(document.querySelectorAll(".site-nav > a"));
    var moreLinks = Array.prototype.slice.call(document.querySelectorAll(".nav-more-menu a"));
    primaryLinks.concat(moreLinks).forEach(function (link) {
        var targetPage = link.getAttribute("href").split("#")[0];
        if (targetPage === currentPage) {
            link.classList.add("active");
            link.setAttribute("aria-current", "page");
            if (link.closest(".nav-more")) {
                var summary = link.closest(".nav-more").querySelector("summary");
                if (summary) summary.classList.add("active");
            }
        }
    });

    moreLinks.forEach(function (link) {
        link.addEventListener("click", function () {
            var menu = link.closest(".nav-more");
            if (menu) menu.open = false;
        });
    });

    document.querySelectorAll(".current-year").forEach(function (year) {
        year.textContent = String(new Date().getFullYear());
    });
}());
