# MORPHORA custom question banks

V4.9.6 supports collection-level authored multiple-choice questions.

The atlas discovers a question bank by convention:

`data/collections/dog-skull.json` -> `data/questions/dog-skull.json`

Keep production questions in the collection bank and use `QUESTION-BANK-TEMPLATE.json` as a starting point.
Only `published` questions are shown to students. `viewIds` may be left empty to make a question available from every view in the collection, or populated with one or more view IDs. `labelId` is optional; when supplied, MORPHORA can highlight and focus that structure while the knowledge question is shown.
