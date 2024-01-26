const reseponseError500 = (response, layout) => {
    return response.status(500).render('500', {
        layout: layout,
        title: "500 - Internal Server Error"
    })
}

module.exports = reseponseError500