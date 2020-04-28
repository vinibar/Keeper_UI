sap.ui.define([
	"sap/ui/base/Object",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (
	Object,
	Filter,
	FilterOperator
) {
	"use strict";

	return Object.extend("vinibar.Keeper_UI.model.Customer", {

		constructor: function (sId, oModel) {
			this._sId = sId;
			this._oModel = oModel;
		},

		createCustomer: async function (oCustomer) {

			var oCustomer = {
				name: oCustomer.name
			};

			return new Promise(function (resolve, reject) {
				this.getModel().create("/Customers", oCustomer, {
					success: function (oCustomer) {
						resolve(oCustomer)
					},
					error: function (oError) {
						reject(oError);
					}
				})
			}.bind(this));


		},

		updateCustomer: async function (oCustomer) {

			var sCustomerPath = this.getModel().createKey("/Customers", { ID: oCustomer.ID });

			var oCustomer = {
				name: oCustomer.name
			};

			return new Promise(function (resolve, reject) {
				this.getModel().update(sCustomerPath, oCustomer, {
					success: resolve(oCustomer),
					error: function (oError) {
						reject(oError);
					}
				})
			}.bind(this));

		},

		deleteCustomer: async function () {

			var sCustomerPath = this.getModel().createKey("/Customers", { ID: this._sId });
			var aCustomerToEnvironmentTypes = [];

			try {
				var aEnvironments = await this.getEnvironments();

				for (let i in aEnvironments) {
					let oEnvironment = aEnvironments[i];
					await this.deleteEnvironment(oEnvironment);
				}

				var aCustomer2EnvironmentTypes = await new Promise(function (resolve, reject) {

					var aFilters = [];
					aFilters.push(new Filter({
						path: "customer_ID",
						operator: FilterOperator.EQ,
						value1: this._sId
					}));

					this.getModel().read("/Customers2EnvironmentTypes", {
						filters: aFilters,
						success: function (aData) {
							resolve(aData.results);
						},
						error: function (oError) {
							reject(oError);
						}
					})

				}.bind(this));

				for (let i in aCustomer2EnvironmentTypes) {

					var oCustomer2EnvironmentType = aCustomer2EnvironmentTypes[i];
					await new Promise(function (resolve, reject) {

						var sCustomer2EnvTypePath = this.getModel().createKey("/Customers2EnvironmentTypes", {
							customer_ID: oCustomer2EnvironmentType.customer_ID,
							environment_type_ID: oCustomer2EnvironmentType.environment_type_ID
						});

						this.getModel().remove(sCustomer2EnvTypePath, {
							success: resolve(true),
							error: reject()
						});
					}.bind(this));
				}

			} finally {

				return new Promise(function (resolve, reject) {
					this.getModel().remove(sCustomerPath, {
						success: resolve(true),
						error: reject()
					})
				}.bind(this));

			}

		},

		getEnvironments: async function () {

			return await new Promise(function (resolve, reject) {
				var aFilters = [];
				aFilters.push(new Filter({
					path: "customer2environment_type_customer_ID",
					operator: FilterOperator.EQ,
					value1: this._sId
				}));

				this.getModel().read("/Environments", {
					filters: aFilters,
					urlParameters: {
						"$expand": "auths"
					},
					success: function (aData) {
						resolve(aData.results);
					},
					error: function (oError) {
						reject(oError);
					}
				})
			}.bind(this));

		},

		createEnvironment: async function (oEnvironment) {

			try {
				await this._hasEnvironmentType(oEnvironment.environment_type_ID);
			} catch (oError) {
				await this._link2EnvironmentType(oEnvironment.environment_type_ID);
			}

			var oEnvironment = await this._createEnvironment(oEnvironment);
			return this.getEnvironment(oEnvironment.ID);
		},

		getEnvironment: async function (sEnvironmentID) {

			var sEnvironmentPath = this.getModel().createKey("/Environments", { ID: sEnvironmentID });

			return new Promise(function (resolve, reject) {
				this.getModel().read(sEnvironmentPath, {
					success: function (oData) {
						resolve(oData);
					},
					error: function (oError) {
						reject(oError);
					},
					urlParameters: {
						"$expand": "customer2environment_type/environment_type,auths"
					}
				})
			}.bind(this));

		},

		deleteEnvironment: async function (oEnvironment) {

			var sEnvironmentPath = this.getModel().createKey("/Environments", { ID: oEnvironment.ID });

			var oEnvironment = await this.getEnvironment(oEnvironment.ID);

			if (oEnvironment.auths.hasOwnProperty("results")) {
				oEnvironment.auths = oEnvironment.auths.results;
			}

			for (let i in oEnvironment.auths) {
				var oCredential = oEnvironment.auths[i];
				if (oCredential.hasOwnProperty("ID")) {
					await this.deleteCredential(oCredential);
				}
			}

			return new Promise(function (resolve, reject) {
				this.getModel().remove(sEnvironmentPath, {
					success: resolve(true),
					error: function (oError) {
						reject(oError)
					},
					refreshAfterChange: false
				})
			}.bind(this));

		},

		updateEnvironment: function (oEnvironment) {

			if (!Array.isArray(oEnvironment.auths)) {
				delete oEnvironment.auths;
			}

			var sEnvironmentPath = this.getModel().createKey("/Environments", { ID: oEnvironment.ID });
			return new Promise(function (resolve, reject) {
				this.getModel().update(sEnvironmentPath, oEnvironment, {
					success: resolve(oEnvironment),
					error: reject()
				})
			}.bind(this));

		},

		createCredential: async function (oNewCredential) {

			return new Promise(function (resolve, reject) {
				this.getModel().create("/Auths", oNewCredential, {
					success: (oData) => {
						resolve(oData);
					},
					error: (oError) => {
						reject(oError);
					}
				});
			}.bind(this));

		},

		updateCredential: function (oCredential) {

			var sCredentialPath = this.getModel().createKey("/Auths", { ID: oCredential.ID });

			return new Promise(function (resolve, reject) {
				this.getModel().update(sCredentialPath, oCredential, {
					success: function (oData) {
						resolve(true);
					},
					error: function (oError) {
						reject(oError);
					}
				});
			}.bind(this));

		},


		deleteCredential: function (oCredential) {

			var sCredentialPath = this.getModel().createKey("/Auths", { ID: oCredential.ID });
			return new Promise(function (resolve, reject) {
				this.getModel().remove(sCredentialPath, {
					success: function (oData) {
						resolve(true);
					},
					error: function (oError) {
						reject(oError);
					}
				});
			}.bind(this));

		},

		_hasEnvironmentType: function (sEnvironmentTypeID) {

			var oCustomer2EnvironmentType = {
				customer_ID: this._sId,
				environment_type_ID: sEnvironmentTypeID
			};

			var sCustomerTypePath = this.getModel().createKey("/Customers2EnvironmentTypes", oCustomer2EnvironmentType);

			return new Promise(function (resolve, reject) {
				this.getModel().read(sCustomerTypePath, {
					success: function (oData) {
						resolve(oData)
					},
					error: function (oError) {
						reject(oError)
					}
				});
			}.bind(this));

		},

		_link2EnvironmentType: function (sEnvironmentTypeID) {

			var oCustomer2EnvironmentType = {
				customer_ID: this._sId,
				environment_type_ID: sEnvironmentTypeID
			};

			return new Promise(function (resolve, reject) {
				this.getModel().create("/Customers2EnvironmentTypes", oCustomer2EnvironmentType, {
					success: resolve(),
					error: (oError) => {
						reject(oError)
					}
				})
			}.bind(this));

		},

		_createEnvironment: function (oEnvironment) {

			var oNewEnvironment = {
				customer2environment_type_customer_ID: this._sId,
				customer2environment_type_environment_type_ID: oEnvironment.environment_type_ID,
				title: oEnvironment.title
			};

			return new Promise(function (resolve, reject) {
				this.getModel().create("/Environments", oNewEnvironment, {
					success: (oData) => {
						resolve(oData);
					},
					error: (oError) => {
						reject(oError);
					}
				});
			}.bind(this));

		},

		getModel: function () {
			return this._oModel;
		}

	});
});