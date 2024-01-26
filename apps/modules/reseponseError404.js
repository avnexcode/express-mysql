const reseponseError404 = (response, layout) => {
    return response.status(404).render('404', {
        layout: layout,
        title: "404 - Page Not Found"
    })
}

module.exports = reseponseError404