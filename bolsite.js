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

    var currentPage = window.location.pathname.split("/").pop() || "index.html";
    var primaryLinks = Array.prototype.slice.call(document.querySelectorAll(".site-nav > a"));
    var moreLinks = Array.prototype.slice.call(document.querySelectorAll(".nav-more-menu a"));
    primaryLinks.concat(moreLinks).forEach(function (link) {
        var targetPage = link.getAttribute("href").split("#")[0];
        if (targetPage === currentPage) {
            link.classList.add("active");
            link.setAttribute("aria-current", "page");
            if (link.closest(".nav-more")) {
                link.closest(".nav-more").open = true;
                var summary = link.closest(".nav-more").querySelector("summary");
                if (summary) summary.classList.add("active");
            }
        }
    });

    document.querySelectorAll(".current-year").forEach(function (year) {
        year.textContent = String(new Date().getFullYear());
    });
}());
