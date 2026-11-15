// SHARED CHURCH DATA FOR THE CALENDAR AND ITS CELEBRATIONS LIST
// MonthIndex: 0=Jan, 1=Feb, 2=Mar, 3=Apr, 4=May, 5=Jun, 6=Jul, 7=Aug, 8=Sep, 9=Oct, 10=Nov, 11=Dec

const bolWeeklyService = {
    enabled: true,
    title: "Sunday Service & Hour of Power (Youth Sunday School after service)"
};

const bolBirthdays = [
    { name: "Testimony & Favour", month: 1, day: 10, type: "Birthday" },
    { name: "Leader Fayefunmi", month: 1, day: 26, type: "Birthday" },
    { name: "Mother Fayefunmi", month: 1, day: 28, type: "Birthday" },
    { name: "Sister Ovo & Marvelous", month: 2, day: 8, type: "Birthday" },
    { name: "Ify", month: 4, day: 1, type: "Birthday" },
    { name: "Jedi", month: 4, day: 30, type: "Birthday" },
    { name: "Bro Elliot", month: 7, day: 6, type: "Birthday" },
    { name: "Grandpa Yussuf", month: 7, day: 13, type: "Birthday" },
    { name: "Eliora", month: 8, day: 8, type: "Birthday" },
    { name: "Sister Aanu", month: 9, day: 22, type: "Birthday" },
    { name: "Benji", month: 4, day: 29, type: "Birthday" },
    { name: "Jemimia", month: 5, day: 28, type: "Birthday" },
    { name: "Sister Bami", month: 4, day: 14, type: "Birthday" }
];

const bolFixedEvents = {
    "0-1": "New Year's Day Blessing",
    "11-25": "Christmas Day Service",
    "11-31": "Crossover Watchnight Service"
};

const bolRuleEvents = [
    { month: "all", nth: 1, weekday: 0, title: "Monthly Thanksgiving & Communion Sunday (+ Hour of Power Youth Sunday School)" },
    { month: 7, nth: 1, weekday: 0, title: "BOL Church Anniversary" },
    { month: 5, nth: 2, weekday: 0, title: "Children's Day" }
];

const bolFlexibleMonthlyEvents = {
    7: [
        "Annual BOL Chess Tournament (Date TBA)",
        "Summer Picnic (Date TBA)"
    ],
    11: [
        "December Brunch (Date TBA)"
    ]
};
