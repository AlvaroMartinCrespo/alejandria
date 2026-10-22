export interface Quote {
  text: string;
  author: string;
  /** Obra o contexto donde aparece la frase (no se muestra en pantalla). */
  source: string;
}

/**
 * Frases de la portada.
 *
 * El orden de esta lista ES el orden en que salen: una por día, y al llegar al
 * final se vuelve a empezar. Con 50 frases, ninguna se repite hasta pasados 50
 * días. Está ordenada a propósito para que nunca salgan seguidas dos del mismo
 * autor ni del mismo tipo.
 *
 * Para añadir una nueva basta con escribirla al final (o donde quieras), pero
 * cambiar la longitud de la lista desordena la secuencia de los próximos días.
 * Las frases en otros idiomas están traducidas al español.
 */
export const QUOTES: readonly Quote[] = [
  { text: "El que lee mucho y anda mucho, ve mucho y sabe mucho.", author: "Miguel de Cervantes", source: "Don Quijote de la Mancha, II, 25" },
  { text: "Estos no necesitan recompensa. Han amado leer.", author: "Virginia Woolf", source: "«¿Cómo debería leerse un libro?», 1926" },
  { text: "Todos los hombres desean por naturaleza saber.", author: "Aristóteles", source: "Metafísica, I, 1" },
  { text: "Que otros se jacten de las páginas que han escrito; a mí me enorgullecen las que he leído.", author: "Jorge Luis Borges", source: "«Un lector», Elogio de la sombra, 1969" },
  { text: "Un libro es la prueba de que los humanos somos capaces de hacer magia.", author: "Carl Sagan", source: "Cosmos, episodio 11, 1980" },
  { text: "Caminante, no hay camino, se hace camino al andar.", author: "Antonio Machado", source: "Campos de Castilla, 1912" },
  { text: "La lectura es a la mente lo que el ejercicio al cuerpo.", author: "Joseph Addison", source: "The Tatler, n.º 147, 1710" },
  { text: "Sin letras, el ocio es la muerte y la tumba del hombre vivo.", author: "Séneca", source: "Cartas a Lucilio, 82" },
  { text: "No hay fragata como un libro para llevarnos lejos.", author: "Emily Dickinson", source: "Poema 1263" },
  { text: "La verdad adelgaza y no quiebra, y siempre anda sobre la mentira como el aceite sobre el agua.", author: "Miguel de Cervantes", source: "Don Quijote de la Mancha, II, 10" },
  { text: "Un clásico es un libro que nunca termina de decir lo que tiene que decir.", author: "Italo Calvino", source: "Por qué leer los clásicos, 1981" },
  { text: "Una vida sin examen no merece la pena ser vivida.", author: "Sócrates", source: "Platón, Apología, 38a" },
  { text: "Los libros son una magia única y portátil.", author: "Stephen King", source: "Mientras escribo, 2000" },
  { text: "La vida no es la que uno vivió, sino la que uno recuerda y cómo la recuerda para contarla.", author: "Gabriel García Márquez", source: "Vivir para contarla, 2002" },
  { text: "Un libro debe ser el hacha que rompa el mar helado que llevamos dentro.", author: "Franz Kafka", source: "Carta a Oskar Pollak, 27 de enero de 1904" },
  { text: "Todo hombre puede ser, si se lo propone, escultor de su propio cerebro.", author: "Santiago Ramón y Cajal", source: "Reglas y consejos sobre investigación científica, 1897" },
  { text: "No puedo vivir sin libros.", author: "Thomas Jefferson", source: "Carta a John Adams, 10 de junio de 1815" },
  { text: "Vivo en conversación con los difuntos y escucho con mis ojos a los muertos.", author: "Francisco de Quevedo", source: "«Desde la torre», siglo XVII" },
  { text: "Hay que cultivar nuestro jardín.", author: "Voltaire", source: "Cándido, 1759" },
  { text: "De los diversos instrumentos del hombre, el más asombroso es, sin duda, el libro.", author: "Jorge Luis Borges", source: "«El libro», Borges oral, 1979" },
  { text: "Lo importante es no dejar de hacerse preguntas.", author: "Albert Einstein", source: "Life, 2 de mayo de 1955" },
  { text: "Fundar bibliotecas era como construir graneros públicos.", author: "Marguerite Yourcenar", source: "Memorias de Adriano, 1951" },
  { text: "El corazón tiene razones que la razón no entiende.", author: "Blaise Pascal", source: "Pensamientos, 277" },
  { text: "Los libros hay que leerlos con tanta calma y reserva como fueron escritos.", author: "Henry David Thoreau", source: "Walden, 1854" },
  { text: "Yo soy yo y mi circunstancia, y si no la salvo a ella no me salvo yo.", author: "José Ortega y Gasset", source: "Meditaciones del Quijote, 1914" },
  { text: "El alma se tiñe del color de sus pensamientos.", author: "Marco Aurelio", source: "Meditaciones, V, 16" },
  { text: "La libertad, Sancho, es uno de los más preciosos dones que a los hombres dieron los cielos.", author: "Miguel de Cervantes", source: "Don Quijote de la Mancha, II, 58" },
  { text: "Hay más de una manera de quemar un libro, y el mundo está lleno de gente con cerillas encendidas.", author: "Ray Bradbury", source: "Fahrenheit 451, epílogo, 1979" },
  { text: "Intenta amar las preguntas mismas.", author: "Rainer Maria Rilke", source: "Cartas a un joven poeta, 1903" },
  { text: "Algunos libros hay que probarlos, otros devorarlos y unos pocos masticarlos y digerirlos.", author: "Francis Bacon", source: "Ensayos, «De los estudios», 1625" },
  { text: "¡Qué descansada vida la del que huye el mundanal ruido!", author: "Fray Luis de León", source: "«Vida retirada», siglo XVI" },
  { text: "Hay crímenes peores que quemar libros. Uno de ellos es no leerlos.", author: "Joseph Brodsky", source: "Rueda de prensa, Biblioteca del Congreso, 17 de mayo de 1991" },
  { text: "¿Me contradigo? Pues muy bien, me contradigo. Soy amplio, contengo multitudes.", author: "Walt Whitman", source: "Canto a mí mismo, 1855" },
  { text: "Lo bueno, si breve, dos veces bueno.", author: "Baltasar Gracián", source: "Oráculo manual y arte de prudencia, 1647" },
  { text: "¿Y de qué sirve un libro sin dibujos ni diálogos?", author: "Lewis Carroll", source: "Alicia en el País de las Maravillas, 1865" },
  { text: "Aprender sin pensar es inútil; pensar sin aprender es peligroso.", author: "Confucio", source: "Analectas, II, 15" },
  { text: "Si he visto más lejos es porque estaba sobre hombros de gigantes.", author: "Isaac Newton", source: "Carta a Robert Hooke, 1675" },
  { text: "Desde que Tirannión ordenó mis libros, mi casa parece haber ganado un alma.", author: "Cicerón", source: "Cartas a Ático, IV, 8" },
  { text: "Lo esencial es invisible a los ojos.", author: "Antoine de Saint-Exupéry", source: "El principito, 1943" },
  { text: "La pluma es la lengua del alma.", author: "Miguel de Cervantes", source: "Don Quijote de la Mancha, II, 16" },
  { text: "La lectura de todos los buenos libros es como una conversación con las mejores personas de los siglos pasados.", author: "René Descartes", source: "Discurso del método, 1637, parte I" },
  { text: "Leemos para saber que no estamos solos.", author: "William Nicholson", source: "Tierras de penumbra, 1989" },
  { text: "No todo el que vaga está perdido.", author: "J. R. R. Tolkien", source: "La Comunidad del Anillo, 1954" },
  { text: "Toda la vida hay que aprender a vivir.", author: "Séneca", source: "Sobre la brevedad de la vida, 7" },
  { text: "El único verdadero viaje no sería ir hacia nuevos paisajes, sino tener otros ojos.", author: "Marcel Proust", source: "La prisionera, 1923" },
  { text: "No fuisteis hechos para vivir como brutos, sino para seguir virtud y conocimiento.", author: "Dante Alighieri", source: "Divina Comedia, Infierno, XXVI" },
  { text: "La experiencia no es más que el nombre que damos a nuestros errores.", author: "Oscar Wilde", source: "El retrato de Dorian Gray, 1890" },
  { text: "Nuestras vidas son los ríos que van a dar en la mar.", author: "Jorge Manrique", source: "Coplas por la muerte de su padre, c. 1476" },
  { text: "Cada uno es hijo de sus obras.", author: "Miguel de Cervantes", source: "Don Quijote de la Mancha, I, 47" },
  { text: "Nada te turbe, nada te espante; todo se pasa.", author: "Santa Teresa de Jesús", source: "«Nada te turbe»" },
];

const DAY_MS = 86_400_000;

/**
 * Frase del día. Avanza una posición por día (según el día UTC, igual en el
 * servidor y en el navegador) y recorre la lista entera antes de repetir.
 */
export function getDailyQuote(now: number = Date.now()): Quote {
  const day = Math.floor(now / DAY_MS);
  return QUOTES[day % QUOTES.length];
}
