GNU nano 8.2                                                                                                                                                                                                 drive.js                                                                                                                                                                                                          
documents.push(doc);

let { blinded, r } = blind(doc, agency.n, agency.e);
blindedDocs.push(blinded);
blindingFactors.push(r);
}
agency.signDocument(blindedDocs, (selected, verifyAndSign) => {
let blindingFactorsForVerification = [];
let originalDocsForVerification = [];
for (let i = 0; i < 10; i++) {
  if (i === selected) {
    blindingFactorsForVerification.push(undefined);
    originalDocsForVerification.push(undefined);
  } else {
    blindingFactorsForVerification.push(blindingFactors[i]);
    originalDocsForVerification.push(documents[i]);
  }
}
let blindedSignature = verifyAndSign(
  blindingFactorsForVerification,
  originalDocsForVerification
);
let unblindedSignature = unblind(
  blindingFactors[selected],
  blindedSignature,
  agency.n
);
let isValid = blindSignatures.verify({
  unblinded: unblindedSignature,
  message: documents[selected],
  N: agency.n,
  E: agency.e,
});

console.log(Document ${selected} signature is valid: ${isValid});
console.log(Signature: ${unblindedSignature});
});
