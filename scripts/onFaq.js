const questions = document.querySelectorAll('.question');

questions.forEach(question => {
  question.addEventListener('click', () => {

    const answer = question.nextElementSibling;
    const arrow = question.querySelector('.arrow');

    if (answer && arrow) {
      answer.classList.toggle('show');
      arrow.classList.toggle('down');
    }
  });
});