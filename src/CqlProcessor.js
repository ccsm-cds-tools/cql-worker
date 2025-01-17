import cql from "cql-execution";
import fhir from "cql-exec-fhir";
import fhirHelpersJson from "./FHIRHelpers-4.0.1.json.js";

/**
 * Executes logical expression written in the Clinical Quality Language (CQL) against
 * a bundle of patient data formatted as FHIR resources.
 */
export default class CqlProcessor {
  /**
   * Create a CQL Processor.
   * @param {object} elmJson - The CQL library formatted in ELM JSON
   * @param {object} valueSetJson - A value set cache which maps codes to clinical concepts
   * @param {object} parameters - Key:value pairs of parameters for the CQL library
   * @param {object} elmJsonDependencies - Libraries referenced from within elmJson.
   */
  constructor(
    elmJson,
    valueSetJson,
    parameters = null,
    elmJsonDependencies = {},
    messageListener = undefined
  ) {
    this.patientSource = fhir.PatientSource.FHIRv401();
    this.repository = new cql.Repository({
      FHIRHelpers: fhirHelpersJson,
      ...elmJsonDependencies,
    });
    this.library = new cql.Library(elmJson, this.repository);
    this.codeService = new cql.CodeService(valueSetJson);
    this.messageListener = messageListener;
    this.executor = new cql.Executor(
      this.library,
      this.codeService,
      parameters,
      this.messageListener
    );
  }

  /**
   * Load a patient bundle into the CQL Processor
   * @param {object} patientBundle - A bundle of FHIR resources for the patient
   */
  loadBundle(patientBundle) {
    this.patientSource.reset(); // necessary to avoid memory leaks
    this.patientSource.loadBundles([patientBundle]);
    this.patientID = this.patientSource._bundles[0].entry
      .filter((resrc) => resrc.resource.resourceType == "Patient")
      .map((resrc) => resrc.resource.id);
  }

  /**
   * Evaluate an expression from the CQL library represented by elmJson against
   * the patient bundle.
   * @param {string} expr - The name of an expression from elmJson
   * @param {string} executionDateTime - Optional, ISO formatted execution datetime if not now
   * @returns {object} results - The results from executing the expression
   */
  async evaluateExpression(expr, executionDateTime = undefined) {
    // Only try to evaluate an expression if we have a patient bundle loaded.
    if (this.patientSource._bundles && this.patientSource._bundles.length > 0) {
      let results;
      if (expr == "__evaluate_library__") {
        results = executionDateTime != undefined ? 
          await this.executor.exec(this.patientSource, cql.DateTime.parse(executionDateTime)):
          await this.executor.exec(this.patientSource);
        return results.patientResults[this.patientID];
      } else {     
        results = executionDateTime != undefined ? 
          await this.executor.exec_expression(
            expr,
            this.patientSource,
            cql.DateTime.parse(executionDateTime)
          ):
          await this.executor.exec_expression(
            expr,
            this.patientSource
          );
        this.patientSource._index = 0; // HACK: rewind the patient source
        return results.patientResults[this.patientID][expr];
      }
    } else return null;
  }

  /**
   * Evaluate an expression from the CQL library represented by elmJson against
   * the patient bundle.
   * @returns {object} results - The results from executing the expression
   */
  async evaluateLibrary(executionDateTime = undefined) {
    return this.evaluateExpression("__evaluate_library__", executionDateTime);
  }
}
