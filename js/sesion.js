(() => {
    const token = sessionStorage.getItem("token");

    if (!token) {
        window.location.replace("index.html");
    }
})();