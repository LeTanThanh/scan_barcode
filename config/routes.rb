Rails.application.routes.draw do
  root "scan#index"

  get "/dynamsoft", to: "scan#dynamsoft", as: :dynamsoft
  get "/webondevices", to: "scan#webondevices", as: :webondevices
end
