(function () {
    "use strict";

    var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var selectedYear = 2026;
    var now = new Date();
    var selectedMonth = now.getFullYear() === 2026 ? Math.floor(now.getMonth() / 2) * 2 : 0;
    var currentView = "paired";

    var yearSelect = document.getElementById("calendar-year");
    var calendarGrid = document.getElementById("calendar-grid");
    var detailDate = document.getElementById("event-date");
    var detailText = document.getElementById("event-description");
    var viewButtons = Array.prototype.slice.call(document.querySelectorAll("[data-calendar-view]"));
    var celebrationHeading = document.getElementById("period-celebrations-title");
    var celebrationSummary = document.getElementById("period-celebrations-summary");
    var celebrationList = document.getElementById("celebration-list");
    var weekTitle = document.getElementById("week-title");
    var weekList = document.getElementById("week-list");

    function addEvent(map, day, title) {
        if (!map[day]) map[day] = [];
        map[day].push(title);
    }

    function nthWeekday(year, month, weekday, nth) {
        if (nth > 0) {
            var firstWeekday = new Date(year, month, 1).getDay();
            return 1 + (weekday - firstWeekday + 7) % 7 + (nth - 1) * 7;
        }
        var finalDate = new Date(year, month + 1, 0);
        return finalDate.getDate() - (finalDate.getDay() - weekday + 7) % 7;
    }

    function eventsForMonth(year, month) {
        var map = {};

        if (typeof bolFixedEvents !== "undefined") {
            Object.keys(bolFixedEvents).forEach(function (key) {
                var parts = key.split("-");
                if (Number(parts[0]) === month) addEvent(map, Number(parts[1]), bolFixedEvents[key]);
            });
        }

        if (typeof bolRuleEvents !== "undefined") {
            bolRuleEvents.forEach(function (rule) {
                if (rule.month === "all" || rule.month === month) addEvent(map, nthWeekday(year, month, rule.weekday, rule.nth), rule.title);
            });
        }

        if (typeof bolBirthdays !== "undefined") {
            bolBirthdays.forEach(function (birthday) {
                if (birthday.month === month) addEvent(map, birthday.day, birthday.name + " · " + birthday.type);
            });
        }

        if (typeof bolWeeklyService !== "undefined" && bolWeeklyService.enabled) {
            var daysInMonth = new Date(year, month + 1, 0).getDate();
            for (var day = 1; day <= daysInMonth; day += 1) {
                if (new Date(year, month, day).getDay() === 0) addEvent(map, day, bolWeeklyService.title);
                if (new Date(year, month, day).getDay() === 4) addEvent(map, day, "Weekly Bible Study · 8:00 PM · Online");
            }
            addEvent(map, nthWeekday(year, month, 6, -1), "Revival Prayer · 6:30 PM · Online");
            addEvent(map, nthWeekday(year, month, 5, 1), "Night Vigil · 10:30 PM · Online");
            for (var worshipDay = 1; worshipDay <= 3; worshipDay += 1) {
                addEvent(map, worshipDay, "Monthly Worship · 8:00 PM · Online");
            }
            if (year === 2026) {
                for (var prayerDay = 1; prayerDay <= daysInMonth; prayerDay += 1) {
                    var prayerDate = new Date(year, month, prayerDay);
                    var dow = prayerDate.getDay();
                    if (prayerDate >= new Date(2026, 1, 9) &&
                        prayerDate <= new Date(2026, 3, 3) && dow >= 1 && dow <= 5) {
                        addEvent(map, prayerDay, "40 Days Prayer · Daily focus · Yearly");
                    }
                }
            }
            if(year === 2026 && month === 3) {
                addEvent(map,3,"Good Friday");
                addEvent(map,5,"Easter Sunday");
            }
            if(month===11) {
                for(var endDay=26;endDay<=30;endDay+=1) addEvent(map,endDay,"End-of-Year Prayers · 8:30 PM · Online");
            }
        }

        return map;
    }

    function celebrationsForMonth(year, month) {
        var items = [];

        if (typeof bolBirthdays !== "undefined") {
            bolBirthdays.forEach(function (birthday) {
                if (birthday.month === month) {
                    items.push({ month: month, day: birthday.day, title: birthday.name, kind: birthday.type + " celebration", isChurchEvent: false });
                }
            });
        }

        if (typeof bolFixedEvents !== "undefined") {
            Object.keys(bolFixedEvents).forEach(function (key) {
                var parts = key.split("-");
                if (Number(parts[0]) === month) {
                    items.push({ month: month, day: Number(parts[1]), title: bolFixedEvents[key], kind: "Church celebration", isChurchEvent: true });
                }
            });
        }

        if (typeof bolRuleEvents !== "undefined") {
            bolRuleEvents.forEach(function (rule) {
                if (rule.month === "all" || rule.month === month) {
                    items.push({ month: month, day: nthWeekday(year, month, rule.weekday, rule.nth), title: rule.title, kind: "Church service & celebration", isChurchEvent: true });
                }
            });
        }

        if (typeof bolFlexibleMonthlyEvents !== "undefined" && bolFlexibleMonthlyEvents[month]) {
            bolFlexibleMonthlyEvents[month].forEach(function (title) {
                items.push({ month: month, day: null, title: title, kind: "Date to be announced", isChurchEvent: true });
            });
        }

        return items.sort(function (left, right) {
            return (left.day === null ? 99 : left.day) - (right.day === null ? 99 : right.day);
        });
    }

    function visibleMonthIndexes() {
        if (currentView === "annual") return monthNames.map(function (_, index) { return index; });
        return [selectedMonth, (selectedMonth + 1) % 12];
    }

    function renderCelebrations() {
        var months = visibleMonthIndexes();
        var periodItems = [];
        months.forEach(function (month) {
            periodItems = periodItems.concat(celebrationsForMonth(selectedYear, month));
        });
        periodItems.sort(function (left, right) {
            if (left.month !== right.month) return left.month - right.month;
            return (left.day === null ? 99 : left.day) - (right.day === null ? 99 : right.day);
        });

        if (currentView === "annual") {
            celebrationHeading.textContent = "Celebrations across " + selectedYear;
            celebrationSummary.textContent = "Birthdays, church services and milestones throughout the year.";
        } else {
            celebrationHeading.textContent = "Celebrations in " + monthNames[months[0]] + "–" + monthNames[months[1]] + " " + selectedYear;
            celebrationSummary.textContent = "This list updates with the two-month calendar view.";
        }

        celebrationList.replaceChildren();
        if (!periodItems.length) {
            var emptyMessage = document.createElement("p");
            emptyMessage.className = "celebration-empty";
            emptyMessage.textContent = "No birthdays or special celebrations are listed for this period yet.";
            celebrationList.appendChild(emptyMessage);
        } else {
            periodItems.forEach(function (item) {
                var card = document.createElement("article");
                card.className = "celebration-card" + (item.isChurchEvent ? " is-church-event" : "");
                var copy = document.createElement("div");
                var title = document.createElement("h3");
                title.textContent = item.title;
                var kind = document.createElement("p");
                kind.textContent = item.kind;
                var date = document.createElement("span");
                date.className = "celebration-date";
                date.textContent = item.day === null ? "Date TBA" : monthNames[item.month].slice(0, 3) + " " + item.day;
                copy.appendChild(title);
                copy.appendChild(kind);
                card.appendChild(copy);
                card.appendChild(date);
                celebrationList.appendChild(card);
            });
        }

        var upcoming = [];
        for (var offset = 0; offset < 7; offset += 1) {
            var date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
            var matches = celebrationsForMonth(date.getFullYear(), date.getMonth()).filter(function (item) {
                return item.day === date.getDate();
            });
            matches.forEach(function (item) {
                var label = offset === 0 ? "Today" : monthNames[date.getMonth()].slice(0, 3) + " " + date.getDate();
                upcoming.push(item.title + " · " + label);
            });
        }

        weekList.replaceChildren();
        if (upcoming.length) {
            weekTitle.textContent = "Let’s celebrate together!";
            upcoming.forEach(function (text) {
                var item = document.createElement("li");
                item.textContent = text;
                weekList.appendChild(item);
            });
        } else {
            weekTitle.textContent = "Upcoming celebrations";
            var note = document.createElement("li");
            note.textContent = "No birthdays or special milestones in the next seven days.";
            weekList.appendChild(note);
        }
    }

    function showDay(year, month, day, map) {
        var date = new Date(year, month, day);
        var items = map[day] || [];
        detailDate.textContent = weekdayNames[date.getDay()] + ", " + monthNames[month] + " " + day + ", " + year;
        detailText.textContent = items.length ? items.join(" · ") : "No scheduled gathering is listed for this date.";
    }

    function renderMonth(year, month, compact) {
        var card = document.createElement("article");
        card.className = "month-card";
        var heading = document.createElement("h2");
        heading.textContent = monthNames[month] + " " + year;
        card.appendChild(heading);

        var weekdays = document.createElement("div");
        weekdays.className = "days-header";
        ["S", "M", "T", "W", "T", "F", "S"].forEach(function (day, index) {
            var label = document.createElement("span");
            label.textContent = day;
            label.setAttribute("aria-label", weekdayNames[index]);
            weekdays.appendChild(label);
        });
        card.appendChild(weekdays);

        var grid = document.createElement("div");
        grid.className = "days-grid";
        var firstWeekday = new Date(year, month, 1).getDay();
        var days = new Date(year, month + 1, 0).getDate();
        var map = eventsForMonth(year, month);

        for (var blank = 0; blank < firstWeekday; blank += 1) {
            var empty = document.createElement("span");
            empty.className = "day";
            empty.setAttribute("aria-hidden", "true");
            grid.appendChild(empty);
        }

        for (var dayNumber = 1; dayNumber <= days; dayNumber += 1) {
            var button = document.createElement("button");
            button.type = "button";
            button.className = "day";
            button.textContent = String(dayNumber);
            var hasEvents = Boolean(map[dayNumber] && map[dayNumber].length);
            if (hasEvents) {
                button.classList.add("has-events");
                button.title = map[dayNumber].join(" · ");
                button.setAttribute("aria-label", monthNames[month] + " " + dayNumber + ", " + year + ": " + map[dayNumber].join(", "));
            } else {
                button.setAttribute("aria-label", monthNames[month] + " " + dayNumber + ", " + year);
            }
            if (year === now.getFullYear() && month === now.getMonth() && dayNumber === now.getDate()) button.classList.add("today");
            button.addEventListener("click", function (chosenDay) {
                return function () {
                    showDay(year, month, chosenDay, map);
                    if (currentView === "annual") {
                        selectedMonth = Math.floor(month / 2) * 2;
                        setView("paired");
                    }
                };
            }(dayNumber));
            grid.appendChild(button);
        }

        card.appendChild(grid);
        if (!compact && typeof bolFlexibleMonthlyEvents !== "undefined" && bolFlexibleMonthlyEvents[month]) {
            var extras = document.createElement("p");
            extras.className = "calendar-note";
            extras.textContent = bolFlexibleMonthlyEvents[month].join(" · ");
            card.appendChild(extras);
        }
        return card;
    }

    function renderAgenda() {
        var area = document.getElementById("calendar-agenda-list");
        if (!area) return;
        area.replaceChildren();
        var months = currentView === "annual" ? monthNames.map(function (_, i) { return i; }) : [selectedMonth, (selectedMonth+1)%12];
        months.forEach(function (month, i) {
            var year = currentView === "paired" && i === 1 && month === 0 ? selectedYear+1 : selectedYear;
            var card = document.createElement("article"); card.className = "calendar-agenda-month";
            var heading = document.createElement("h3");heading.textContent = monthNames[month]+" "+year;card.appendChild(heading);
            var eventMap=eventsForMonth(year,month), days=Object.keys(eventMap).map(Number).sort(function(a,b){return a-b;});
            if(!days.length){var empty=document.createElement("p");empty.textContent="No activities listed.";card.appendChild(empty);}
            days.forEach(function(day){
                var row=document.createElement("div");row.className="calendar-agenda-row";
                var label=document.createElement("strong");label.textContent=monthNames[month].slice(0,3)+" "+day;
                var list=document.createElement("div");
                eventMap[day].forEach(function(name){var title=document.createElement("p");title.textContent=name;list.appendChild(title);});
                row.append(label,list);card.appendChild(row);
            });
            area.appendChild(card);
        });
    }

    function render() {
        calendarGrid.replaceChildren();
        calendarGrid.classList.toggle("annual-view", currentView === "annual");
        viewButtons.forEach(function (button) {
            button.setAttribute("aria-pressed", button.getAttribute("data-calendar-view") === currentView ? "true" : "false");
        });

        if (currentView === "paired") {
            var nextMonth = (selectedMonth + 1) % 12;
            calendarGrid.appendChild(renderMonth(selectedYear, selectedMonth, false));
            calendarGrid.appendChild(renderMonth(selectedYear, nextMonth, false));
        } else {
            for (var month = 0; month < 12; month += 1) calendarGrid.appendChild(renderMonth(selectedYear, month, true));
        }
        renderCelebrations();
        renderAgenda();
    }

    function setView(view) {
        currentView = view;
        render();
    }

    document.getElementById("period-back").addEventListener("click", function () {
        selectedMonth = (selectedMonth + 10) % 12;
        render();
    });
    document.getElementById("period-forward").addEventListener("click", function () {
        selectedMonth = (selectedMonth + 2) % 12;
        render();
    });
    yearSelect.addEventListener("change", function () {
        selectedYear = Number(yearSelect.value);
        selectedMonth = 0;
        detailDate.textContent = "Your church calendar";
        detailText.textContent = "Choose a date to see a gathering, celebration or church milestone.";
        render();
    });
    viewButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            setView(button.getAttribute("data-calendar-view"));
        });
    });

    yearSelect.value = String(selectedYear);
    render();
}());
